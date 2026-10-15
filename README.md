# TimeGrid Studio UCE

## Introduction
TimeGrid Studio UCE is a web application designed to organize and visualize university schedules, especially those with an irregular distribution of subjects throughout the week.

The application displays subjects in a grid of days and time slots, allowing users to view and modify their weekly schedules through a single interface.

## Features
* Subject registration and organization.
* Class scheduling by day and time.
* Visual customization of subjects.
* Data import and export.
* Adaptation for desktop computers and mobile devices.
* Installation as an application through PWA functionality in compatible browsers.

## Technologies
HTML5, CSS3, and JavaScript.  
Web App Manifest for PWA configuration.  
GitHub Pages for deployment.

## Access
https://davocc024.github.io/Independent-irregular-schedule-generator/

## Status
Project under development. Features and interface elements may be modified through future updates.

## License
Distributed under the GNU General Public License v3.0 (GPL-3.0). The complete terms are available in the `LICENSE` file in the repository.

## Authorship
TimeGrid Studio UCE  
Independent project for organizing and visualizing academic schedules.

---

## AI-Assisted Schedule Extraction

TimeGrid Studio UCE can use an AI-assisted extraction process to convert university schedules presented as images into JSON files compatible with the application.

The following prompt is designed for AI tools capable of image analysis. Its purpose is to extract subjects, schedules, and other required fields for TimeGrid according to a predefined data structure.

### Extraction Prompt

```text
Act as an expert OCR data extraction and academic schedule normalization engine for mobile applications. Your sole task is to process the provided university schedule document/image and extract the information for ALL subjects present, generating a 100% accurate, complete JSON file without omitting any subjects or time slots.

### STRICT EXTRACTION AND FORMATTING RULES:

1. **JSON Structure per Subject:**
   - "id": Sequential unique integer (e.g., 1, 2, 3...).
   - "name": Official subject name in Title Case (e.g., "Physical Chemistry I").
   - "level": Deduce the semester from the image title (e.g., if the title says BF4-P01, it is "Semester 4"). Use the strict English format: "Semester X".
   - "course": Deduce the parallel/section from the image title (e.g., if the title says BF4-P02, it is "P-2"). Use the strict format "P-X" without leading zeros. NEVER use "P-01".
   - "note": Professor's name and classroom (e.g., "Orbea C. / Lab AL3-2"). If unavailable, leave as `""`.
   - "isMandatory": Boolean (`false` by default; set to `true` only if explicitly instructed).
   - "color": Assign the SAME hex color to all sections of the same subject. Choose strictly from this list: ["#a8c7fa", "#e5c07b", "#81c995", "#fde293", "#f28b82", "#78d9ec", "#fcaded", "#a8dab5", "#fcb97d", "#8ab4f8"].
   - "slots": Array of time blocks. Each object must contain:
     - "day": Day of the week in UPPERCASE English with correct spelling ("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY").
     - "start": Start time as a 24-hour integer (e.g., 7, 10, 14). No decimals.
     - "end": End time as a 24-hour integer (e.g., 9, 13, 17). No decimals.

2. **Consecutive Hours Merging (CRITICAL):**
   - Carefully read the grid rows (7:00 to 20:00).
   - If a class spans back-to-back hours on the same day (e.g., 14:00 to 15:00 and 15:00 to 16:00), you MUST combine them into a single continuous time slot (`start: 14`, `end: 16`). Do not leave separate 1-hour blocks if they are continuous.

3. **MANDATORY INTERNAL AUDIT PROTOCOL (Self-Correction):**
   Before generating the final output, perform a silent internal check:
   - *Course Check:* Is the `course` field formatted exactly as `"P-1"` (no leading zero)?
   - *Completeness Check:* Have all visible hours for ALL subjects been extracted without omission?
   - *Syntax Check:* Are `start` and `end` formatted as integers? Is `isMandatory` a boolean? Are the English day names spelled correctly?
   - If you detect any discrepancy, fix the affected block internally before outputting the data.

Return ONLY the final JSON code block. Absolutely no greetings, explanations, or text outside the JSON block.
```
