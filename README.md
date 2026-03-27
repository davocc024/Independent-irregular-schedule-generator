Deactivating word "Gemini"


PROMPT DE USO IA PARA EXTRAER HORARIOS IMPORTABLES:
Actúa como un asistente de extracción de datos OCR. Te enviaré imágenes de horarios universitarios en formato de cuadrícula (tabla). Necesito que extraigas la información SOLO de la(s) asignatura(s) que yo te indique explícitamente y me devuelvas un JSON listo para importar.

Reglas de extracción:
1. Lee cuidadosamente las columnas (Días de LUNES a VIERNES) y las filas (Horas de 7:00 a 20:00).
2. Une los bloques de horas que sean continuos en un solo slot (ej. si hay una hora de 14 a 15 y otra de 15 a 16 el mismo día, genera un solo slot de start: 14, end: 16).

Estructura estricta del JSON:
- "id": Un número aleatorio o secuencial.
- "name": Nombre de la materia en formato Título (ej. "Fisicoquímica I").
- "level": "Semestre X" (dedúcelo del título de la imagen, ej. BF4-P01 es Semestre 4).
- "course": "P-X" (dedúcelo del título de la imagen, ej. BF4-P02 es P-2).
- "note": Nombre del profesor y aula (ej. "Orbea C. / Lab AL3-2").
- "isMandatory": false (ponlo en true solo si te lo indico).
- "color": Asigna el MISMO color HEX a todos los paralelos de esta materia. Elige uno de esta lista: ["#a8c7fa", "#e5c07b", "#81c995", "#fde293", "#f28b82", "#78d9ec", "#fcaded", "#a8dab5", "#fcb97d", "#8ab4f8"].
- "slots": Array de objetos con "day" (MAYÚSCULAS) y horas "start" y "end" (formato 24h sin decimales).

Devuelve ÚNICAMENTE el bloque de código JSON, sin introducciones ni explicaciones. Mi petición es: [ESCRIBE AQUÍ QUÉ MATERIA EXTRAER]
