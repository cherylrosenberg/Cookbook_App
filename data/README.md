# RAG corpus data (not committed)

## Martinez dataset (PR2)

1. Download **13k-recipes.csv** from [josephrmartinez/recipe-dataset](https://github.com/josephrmartinez/recipe-dataset) (CC BY-SA 3.0).
2. Save as `martinez-13k-recipes.csv` in this folder.

The GitHub file may include extra columns (`Image_Name`, `Cleaned_Ingredients`, index); ingest uses `Title`, `Ingredients`, and `Instructions` only.

Optional download (PowerShell, from `Cookbook_App`):

```powershell
curl -L -o data/martinez-13k-recipes.csv "https://raw.githubusercontent.com/josephrmartinez/recipe-dataset/main/13k-recipes.csv"
```

(If the raw URL moves, use the repo Releases or clone and copy the file.)

## License

Use under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Attribute the dataset; share-alike applies to derivatives you **distribute**. Internal RAG indexing for a personal app is typically fine; verify for your use case.

## Ingest

See SETUP_GUIDE.md — `npm run ingest:martinez -- --dry-run --limit 50` then full subset ingest.
