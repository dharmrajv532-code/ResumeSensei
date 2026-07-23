import os
import sys
import shutil

def export_slides():
    ppt_path = "D:/secondyear internship/resume analyser/ResumeSensei_Presentation.pptx"
    output_dir = "C:/Users/user/.gemini/antigravity-ide/brain/1d580c6b-f883-4364-a169-12b215a06ba1/slides"
    
    # Ensure output directory exists and is clean
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Opening presentation: {ppt_path}")
    print(f"Exporting to directory: {output_dir}")
    
    try:
        import win32com.client
    except ImportError as e:
        print(f"ImportError: pywin32 is not fully set up. Error: {e}")
        return False
        
    try:
        # Initialize COM
        import pythoncom
        pythoncom.CoInitialize()
        
        powerpoint = win32com.client.Dispatch("PowerPoint.Application")
        # Ensure it runs invisibly
        powerpoint.Visible = True  # Sometimes required to prevent hang on Open
        
        ppt_abs = os.path.abspath(ppt_path)
        out_abs = os.path.abspath(output_dir)
        
        presentation = powerpoint.Presentations.Open(ppt_abs, ReadOnly=True, WithWindow=False)
        # 17 is the constant for saving as PNG in PowerPoint (ppSaveAsPNG)
        presentation.SaveAs(os.path.join(out_abs, "slide.png"), 17)
        presentation.Close()
        powerpoint.Quit()
        print("Export completed successfully!")
        
        # List generated files to verify
        files = os.listdir(output_dir)
        print(f"Generated files: {files}")
        return True
    except Exception as e:
        print(f"Failed to export slides: {e}")
        try:
            powerpoint.Quit()
        except:
            pass
        return False

if __name__ == "__main__":
    success = export_slides()
    sys.exit(0 if success else 1)
