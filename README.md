# CFMTIS

Cyber Fraud Money Trail Intelligence System.

## Run

```bash
docker-compose up -d

cd server
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev

cd ../client
npm install
npm run dev
```

Default seeded login:

- Badge Number: `CID-001`
- Password: `Admin@1234`
# cfmtis
