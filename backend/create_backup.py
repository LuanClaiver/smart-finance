from app.services.backup import create_backup

if __name__ == "__main__":
    path = create_backup(force=True)
    print(f"Backup criado: {path}")
