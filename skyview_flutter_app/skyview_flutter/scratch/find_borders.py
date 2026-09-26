import os
import re

lib_dir = "skyview_flutter_app/skyview_flutter/lib"
for root, dirs, files in os.walk(lib_dir):
    for file in files:
        if file.endswith(".dart"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for idx, line in enumerate(lines):
                if "border:" in line or "Border(" in line or "Border.all(" in line or "borderRadius:" in line:
                    # check if the surrounding code defines a border with non-uniform values
                    print(f"{file}:{idx+1}: {line.strip()}")
