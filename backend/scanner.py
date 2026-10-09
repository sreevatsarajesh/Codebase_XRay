import os
def scan_repositories(path):
    nodes =[]
    edges=[]
    errors=[]
    if not os.path.exists(path):
        raise FileNotFoundError("Repo path does not exist")
    if not os.path.isdir(path):
        raise NotADirectoryError("The provided path is not a directory")
    print("Repository path is valid")

    ignore = [""]
