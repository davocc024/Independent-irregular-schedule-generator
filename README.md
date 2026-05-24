Deactivating the word "Gemini"

AI USAGE PROMPT FOR EXTRACTING IMPORTABLE SCHEDULES: This acts as an OCR data extraction wizard. I will send you images of university schedules in grid (table) format. I need you to extract the information ONLY from the subject(s) I explicitly specify and return a JSON file ready for import.

Extraction Rules:
1. Carefully read the columns (Days from MONDAY to FRIDAY) and the rows (Hours from 7:00 to 20:00).

2. Combine consecutive blocks of hours into a single slot (e.g., if there is an hour from 14:00 to 15:00 and another from 15:00 to 16:00 on the same day, generate a single slot starting at 14:00 and ending at 16:00).

Strict JSON Structure:
- "id": A random or sequential number.

- "name": Subject name in Title format (e.g., "Physical Chemistry I").

- "level": "Semester X" (deduce this from the image title, e.g., BF4-P01 is Semester 4).

- "course": "P-X" (deduce this from the image title, e.g., BF4-P02 is P-2).

- "note": Professor's name and classroom (e.g., "Orbea C. / Lab AL3-2").

- "isMandatory": false (set to true only if instructed).

- "color": Assign the SAME HEX color to all sections of this subject. Choose one from this list: ["#a8c7fa", "#e5c07b", "#81c995", "#fde293", "#f28b82", "#78d9ec", "#fcaded", "#a8dab5", "#fcb97d", "#8ab4f8"].

- "slots": An array of objects with "day" (UPPERCASE) and "start" and "end" times (24-hour format, no decimals).

Return ONLY the JSON code block, without any introductions or explanations. My request is: [WRITE HERE WHAT MATERIAL TO EXTRACT]
