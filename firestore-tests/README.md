# Tests für die Firestore-Regeln

Prüft `../firestore.rules` im lokalen Firestore-Emulator: 20 normale Abläufe der App
müssen erlaubt sein, 20 Missbrauchsfälle müssen scheitern.

Voraussetzungen: Node.js 18+ und Java 11+ (für den Emulator).

```bash
cd firestore-tests
npm install
npm test
```

Die Tests laufen nur lokal gegen das Demo-Projekt `demo-bike-rules` und berühren
das echte Firebase-Projekt nicht.
