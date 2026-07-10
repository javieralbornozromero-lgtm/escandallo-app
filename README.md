# Cuaderno de Escandallos — versión web (Netlify)

Esta es la app lista para subir a Netlify y usarla desde el PC, iPhone y Android como una app instalada, igual que hiciste con la de manicura.

---

## Opción A (recomendada): subir directamente a Netlify, sin instalar nada

No necesitas Node.js ni tocar una terminal. Netlify compila la app por ti.

1. Ve a **https://github.com** y crea una cuenta gratis si no tienes.
2. Crea un repositorio nuevo (arriba a la derecha → "New repository"). Ponle un nombre, por ejemplo `escandallo-app`. Puede ser público o privado.
3. En la página del repositorio recién creado, verás un enlace tipo "uploading an existing file" (o el botón "Add file" → "Upload files"). Descomprime este proyecto en tu ordenador y arrastra **todo el contenido de la carpeta** (index.html, package.json, netlify.toml, las carpetas `src/` y `public/`, etc.) a esa zona. Confirma con "Commit changes".
4. Ve a **https://app.netlify.com** → "Add new site" → "Import an existing project" → conecta tu cuenta de GitHub → elige el repositorio que acabas de crear.
5. Netlify leerá el archivo `netlify.toml` y configurará solo el comando de compilación (`npm run build`) y la carpeta a publicar (`dist`). Dale directamente a **"Deploy site"**.
6. Espera 1-2 minutos. Te da una URL tipo `https://tu-app-xxxxx.netlify.app` — esa es tu app, ya en internet.

## Opción B: si prefieres compilarla tú antes (como quizá hiciste con la de manicura)

Necesitas Node.js instalado (https://nodejs.org, versión LTS). Luego, en una terminal dentro de esta carpeta:
```
npm install
npm run build
```
Esto genera una carpeta `dist/`. Ve a **https://app.netlify.com** → "Add new site" → "Deploy manually" → arrastra la carpeta `dist/` ahí. Te da la URL al momento.

---

## Después de publicarla: instalarla en cada dispositivo

Abre la URL que te dio Netlify en cada sitio:

- **PC (Chrome/Edge):** en la barra de direcciones aparece un icono de instalar (un monitor con una flecha), o menú → "Instalar Cuaderno de Escandallos".
- **Android (Chrome):** te sale un aviso de "Añadir a pantalla de inicio", o desde el menú (⋮) → "Instalar app".
- **iPhone (Safari — tiene que ser Safari, no Chrome):** botón de compartir (cuadrado con flecha hacia arriba) → "Añadir a pantalla de inicio".

En los tres casos queda como un icono normal, a pantalla completa, sin barra de navegador.

**Importante sobre los datos:** cada dispositivo guarda sus propios datos por separado (no se sincronizan automáticamente entre el PC, el móvil de la barra y el tuyo). Usa **Ajustes → Exportar copia de seguridad** en uno y **Importar copia de seguridad** en otro para pasar la información de un dispositivo a otro cuando lo necesites.

---

## Recuerda: tu clave API de Anthropic

Las funciones de IA (leer facturas, cierre de caja, crear escandallos desde foto/PDF) necesitan que pegues tu clave en **Ajustes → Clave API de Anthropic**. Consíguela en https://console.anthropic.com (API Keys). Esa clave se guarda solo en el dispositivo donde la pegues — si usas la app en el móvil también, tendrás que pegarla ahí también.

---

## Actualizar la app más adelante

Si en el futuro quiero (o quieres) hacerte cambios en la app, solo hay que:
1. Sustituir los archivos del repositorio de GitHub por la nueva versión (arrastrando de nuevo, como al principio).
2. Netlify vuelve a compilar y publicar automáticamente en cuanto detecta el cambio — no hace falta hacer nada más, ni reinstalarla en los móviles (la próxima vez que la abran, se actualiza sola).
