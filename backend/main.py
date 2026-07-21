import os
import time
import uuid
from typing import Dict, Optional, List
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from parser import extract_text_from_pdf, extract_text_from_docx, validate_extracted_text, convert_pdf_to_images
from analyzer import analyze_resume_text, analyze_resume_images, generate_chat_response

# Load environment variables
load_dotenv()

app = FastAPI(title="Resume Analyser Backend API")

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins + ["*"], # Dev friendly fallback
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported file extensions & size limits
SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# In-memory session store
class ChatSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.jd_text: str = ""
        self.resume_text: str = ""
        self.resume_images: List[bytes] = []
        self.resume_mime_type: str = ""
        self.last_analysis: Optional[Dict] = None
        self.history: List[Dict[str, str]] = []  # [{"role": "user"|"assistant", "content": "..."}]
        self.last_accessed: float = time.time()

sessions: Dict[str, ChatSession] = {}

def get_or_create_session(session_id: str) -> ChatSession:
    """Retrieves session by ID and cleans up old inactive sessions (>2 hours)."""
    now = time.time()
    # Housekeeping: delete sessions inactive for > 2 hours (7200 seconds)
    expired_ids = [sid for sid, sess in sessions.items() if now - sess.last_accessed > 7200]
    for sid in expired_ids:
        del sessions[sid]
        
    if session_id not in sessions:
        sessions[session_id] = ChatSession(session_id)
    else:
        sessions[session_id].last_accessed = now
        
    return sessions[session_id]

@app.get("/")
def read_root():
    return {"message": "Resume Analyser Chat API is running."}

@app.post("/session/reset")
def reset_session(session_id: str = Form(...)):
    if session_id in sessions:
        del sessions[session_id]
    return {"status": "success", "message": f"Session {session_id} has been reset."}

@app.post("/chat")
async def chat_endpoint(
    session_id: str = Form(...),
    message: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    session = get_or_create_session(session_id)
    
    # Check if neither input was provided
    if not file and (not message or not message.strip()):
        raise HTTPException(
            status_code=400,
            detail="Empty request. Please type a message or upload a file."
        )

    # 1. Handle File Upload if present
    if file:
        if message and message.strip():
            session.jd_text = message.strip()
            
        filename = file.filename or ""
        _, ext = os.path.splitext(filename.lower())
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported formats: PDF, DOCX, JPG, JPEG, PNG."
            )

        try:
            contents = await file.read()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds the 5MB limit. Please upload a smaller file."
            )

        session.resume_images = []
        session.resume_text = ""
        analysis_data = None
        file_type = ""
        
        # Parse PDF
        if ext == ".pdf":
            try:
                extracted_text = extract_text_from_pdf(contents)
                validation = validate_extracted_text(extracted_text, is_pdf=True)
                
                if validation["status"] in {"scanned_pdf", "too_short"}:
                    file_type = "scanned_pdf"
                    session.resume_images = convert_pdf_to_images(contents, max_pages=3)
                    session.resume_mime_type = "image/png"
                    if not session.resume_images:
                        raise HTTPException(
                            status_code=400,
                            detail="Failed to extract text or render scanned PDF. Please upload a clear file."
                        )
                    # Run Vision model analysis
                    analysis_data = analyze_resume_images(
                        session.resume_images, 
                        jd_text=session.jd_text, 
                        mime_type="image/png"
                    )
                elif validation["status"] == "garbled":
                    raise HTTPException(status_code=400, detail=validation["message"])
                else:
                    file_type = "pdf"
                    session.resume_text = extracted_text
                    analysis_data = analyze_resume_text(extracted_text, jd_text=session.jd_text)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

        # Parse DOCX
        elif ext == ".docx":
            try:
                extracted_text = extract_text_from_docx(contents)
                validation = validate_extracted_text(extracted_text, is_pdf=False)
                
                if validation["status"] != "valid":
                    raise HTTPException(status_code=400, detail=validation["message"])
                
                file_type = "docx"
                session.resume_text = extracted_text
                analysis_data = analyze_resume_text(extracted_text, jd_text=session.jd_text)
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error parsing DOCX: {str(e)}")

        # Parse Image
        elif ext in {".jpg", ".jpeg", ".png"}:
            try:
                file_type = "image"
                session.resume_mime_type = "image/png" if ext == ".png" else "image/jpeg"
                session.resume_images = [contents]
                # Run Vision model analysis
                analysis_data = analyze_resume_images(
                    session.resume_images, 
                    jd_text=session.jd_text, 
                    mime_type=session.resume_mime_type
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

        # Save analysis in session
        session.last_analysis = analysis_data
        ai_response = analysis_data["conversational_response"]
        
        # Append message history
        session.history.append({
            "role": "user",
            "content": f"[Uploaded Resume File: {filename} ({file_type})]"
        })
        session.history.append({
            "role": "assistant",
            "content": ai_response
        })
        
        return {
            "session_id": session_id,
            "message": ai_response,
            "analysis": analysis_data
        }

    # 2. Handle Text-Only Message (Follow-up or JD declaration)
    else:
        text_message = message.strip()
        
        # Case A: User has not uploaded a resume yet -> Treat message as the Job Description (JD)
        if not session.resume_text and not session.resume_images:
            session.jd_text = text_message
            ai_response = (
                "Understood! I have saved the target Job Description.\n\n"
                "Please upload your resume (PDF, DOCX, or Image) now, "
                "and I will provide a detailed critique and a job-fit score."
            )
            session.history.append({"role": "user", "content": text_message})
            session.history.append({"role": "assistant", "content": ai_response})
            
            return {
                "session_id": session_id,
                "message": ai_response,
                "analysis": None
            }
            
        # Case B: Resume already exists in session -> Treat message as follow-up question
        else:
            try:
                # If resume text is empty (scanned pdf/image), we provide a summary placeholder for text context
                resume_ctx = session.resume_text
                if not resume_ctx and session.resume_images:
                    resume_ctx = "[Resume uploaded as Image/Scanned PDF]"
                
                ai_response = generate_chat_response(
                    message=text_message,
                    history=session.history,
                    resume_text=resume_ctx,
                    jd_text=session.jd_text,
                    last_analysis=session.last_analysis
                )
                
                session.history.append({"role": "user", "content": text_message})
                session.history.append({"role": "assistant", "content": ai_response})
                
                return {
                    "session_id": session_id,
                    "message": ai_response,
                    "analysis": session.last_analysis  # Return existing analysis to keep dashboard active
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")
