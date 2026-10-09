import os
def scan_repositories(path):
    nodes =[]
    edges=[]
    errors=[]
    if not os.path.exists(path):
        
