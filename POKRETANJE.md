# SOA Tourism App - Kako Pokrenut

## Zahtevi

- **Docker Desktop** - Preuzmi sa [docker.com](https://www.docker.com/products/docker-desktop)
- Instalacija: Windows, Mac, ili Linux

## Pokretanje

### Windows
```bash
# Otvori PowerShell ili CMD u direktorijumu soa-tourism-app
cd soa-tourism-app

# Pokreni sve servise
docker-compose up --build
```

### Linux / Mac
```bash
cd soa-tourism-app
docker-compose up --build
```

## Šta se dešava

1. **PostgreSQL baza** - Startuje na `localhost:5432`
2. **Backend** - Java Spring Boot na `http://localhost:8081/api`
3. **Frontend** - React aplikacija na `http://localhost:3001`

Čekaj 1-2 minuta da se sve pokrene.

## Pristup Aplikaciji

Kada vidišu:
```
stakeholders-service | ... Tomcat started on port(s): 8081
frontend | ... Listening on ...
```

Otvori browser i idi na: **http://localhost:3001**

## Korišćenje

1. Klikni **Register** - Kreiraj novi nalog
2. Odaberi ulogu: **Guide** (Vodič) ili **Tourist** (Turista)
3. Popuni: username, email, password
4. Klikni "Register"
5. Automatski ćeš biti prebačen na **Profile** stranicu
6. Klikni "Edit Profile" i popuni detalje (ime, prezime, biografija, moto)

## Zaustavljanje

```bash
# U terminalu gde vidiš logove, pritisni:
Ctrl + C

# Ili u novom terminalu:
docker-compose down
```

## Ako nešto ne radi

```bash
# Očisti sve i restartuj
docker-compose down -v
docker-compose up --build
```

## Funkcionalnosti

✅ **Registracija** - Registrujem se kao Guide ili Tourist
✅ **Login** - Prijava sa username i lozinka
✅ **Profil** - Pregled i ažuriranje mojeg profila
✅ **Baza** - PostgreSQL čuva sve podatke

---

**Sve je spremno! Samo pokreni `docker-compose up --build` i uživaj! 🚀**
