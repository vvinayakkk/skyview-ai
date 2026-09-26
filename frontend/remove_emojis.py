import os
import re

src_dir = r"c:\Desktop\project\AMD_Hack\frontend\src"
emoji_pattern = re.compile(r"[\U0001F300-\U0001F64F\U0001F680-\U0001F6FF\u2600-\u26FF\u2700-\u27BF\U0001F900-\U0001F9FF\U0001FA70-\U0001FAFF]")

changed = 0
for root, _, files in os.walk(src_dir):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            
            if emoji_pattern.search(content):
                new_content = emoji_pattern.sub("", content)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Fixed {filepath}")
                changed += 1

print(f"Total fixed: {changed}")
