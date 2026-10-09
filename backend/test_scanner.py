from scanner import scan_repository
import json

path = input("Enter the path to a Python project: ").strip()

try:
    result = scan_repository(path)
    print(json.dumps(result, indent=4))
except (FileNotFoundError, NotADirectoryError) as e:
    print("Error:", e)
