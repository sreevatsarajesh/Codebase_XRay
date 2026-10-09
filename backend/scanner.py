import os
import ast
def scan_repository(path):
    nodes =[]
    edges=[]
    errors=[]
    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")
    print("Repository path is valid")
    dir_ignore = [".gitignore",".venv","node_modules","__pycache__","venv"]
    for root,dirs,files in os.walk(path):
        dirs[:]=[d for d in dirs if d not in dir_ignore]
        for file in files:
            if not file.endswith(".py"):
                continue
        file_path = os.path.join(root,file)
        print("Scanning:",file_path)
