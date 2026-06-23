# Invitații cu Dichis by Ale — Context Proiect

## Despre proiect
Site de prezentare și vânzare invitații handmade pentru nunți și botezuri, creat pentru Alexandra (Ale).
Comunicarea se face în **limba română**.

## Locație
- **Folder principal (cu Git):** `D:\Proiecte\Invitatii cu Dichis by Ale\`
- **Copie backup:** `D:\Proiecte\invitatii-cu-dichis\` (fără Git — nu lucra aici)

## Stack tehnic
- HTML + CSS + JavaScript vanilla (fără framework)
- Firebase Firestore (SDK compat v10.7.1) — baza de date live
- Google Fonts: Great Vibes, Cormorant Garamond, Lato
- Nu are server local — se deschide direct în browser (`index.html`)

## Fișiere
| Fișier | Rol |
|---|---|
| `index.html` | Pagina publică (clienți) |
| `style.css` | Tot stilul (public + admin, temă roz/auriu) |
| `script.js` | Logică pagină publică |
| `admin.html` | Panou de administrare |
| `admin.js` | Logică admin |
| `firebase-config.js` | Configurare Firebase |
| `logo.jpg` | Logo-ul site-ului |

## Funcționalități implementate
- Grid produse cu filtre pe categorii
- Categorii implicite: Invitații Nuntă, Invitații Botez, Plicuri (+ categorii custom din admin)
- Calculator preț per produs (cantitate × preț + supliment tip hârtie)
- Lightbox imagini cu navigare săgeți, click și swipe mobil
- Admin panel cu login (user/parolă hardcodate în `admin.js`)
- CRUD produse cu până la 4 imagini per produs (stocate base64 în Firestore)
- Tipuri de hârtie configurabile cu supliment de preț
- Date contact editabile din admin (WhatsApp, Facebook, Instagram)
- Design responsive (desktop + mobil)

## Firebase
- **Project ID:** `invitatii-cu-dichis`
- **Colecții Firestore:** `products`, `config/categories`, `config/paperTypes`, `config/contact`
- Imaginile sunt stocate ca base64 direct în Firestore (nu Firebase Storage)

## Preferințe
- Scrie întotdeauna în **română**
- Testarea se face deschizând `index.html` direct în browser
- Admin accesibil la `admin.html`

## Workflow deploy
- Lucrează **doar local** pe `D:\Proiecte\Invitatii cu Dichis by Ale\`
- **Nu face push** la GitHub/Netlify decât când utilizatorul spune explicit "actualizează link-ul"
- La update: `git add -A` → `git commit` → `git push origin main`
- git.exe: `C:\Users\rr875\AppData\Local\GitHubDesktop\app-3.5.12\resources\app\git\cmd\git.exe`
- Site live: https://invitatii-cu-dichis-by-ale.netlify.app/
- GitHub: https://github.com/rr875749-pixel/invitatii-cu-dichis
