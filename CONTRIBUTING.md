# Contribuer à Covid19 MapViz

Merci de votre intérêt ! Toute contribution est la bienvenue : correction de bug, nouvelle visualisation, documentation, traduction.

## Avant de commencer

- Cherchez dans les [issues](https://github.com/Aziguy/Covid19_MapViz/issues) si le sujet existe déjà.
- Pour un changement important, ouvrez d'abord une issue afin d'en discuter.
- Respectez le [code de conduite](CODE_OF_CONDUCT.md).

## Environnement de développement

```bash
git clone https://github.com/<votre-compte>/Covid19_MapViz.git
cd Covid19_MapViz
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

Dashboard en local :

```bash
covid-mapviz site -o _site
python -m http.server -d _site 8000
```

Les fichiers de `web/` sont copiés tels quels : relancez `covid-mapviz site` après chaque modification.

## Flux de travail

1. Forkez le dépôt et créez une branche depuis `master` : `feat/ma-fonctionnalite`, `fix/mon-correctif`.
2. Faites des commits petits et ciblés.
3. Ajoutez ou mettez à jour les tests.
4. Vérifiez que tout passe :

   ```bash
   pytest
   ruff check . && ruff format --check .
   npx prettier@3.3.3 --check web
   ```

5. Ouvrez une pull request en remplissant le modèle.

## Conventions

- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/fr/) (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`), message court à l'impératif.
- **Python** : formaté et vérifié par Ruff, typé quand c'est utile, docstrings courtes.
- **Web** : HTML, CSS et modules JavaScript natifs sans build, formatés par Prettier. Les couleurs passent par les variables CSS de `style.css` pour rester compatibles avec le thème sombre.
- **Tests** : couverture minimale de 90 %, aucun appel réseau réel (utiliser `responses` ou `monkeypatch`).
- **Commentaires** : rares, précis et concis.

## Signaler un bug

Utilisez le modèle [Bug](https://github.com/Aziguy/Covid19_MapViz/issues/new?template=bug_report.md) en précisant les étapes de reproduction, le comportement attendu et votre environnement.
