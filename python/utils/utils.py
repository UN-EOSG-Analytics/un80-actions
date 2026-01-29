from pathlib import Path


def export_dataframe(df, filename_base: str, output_dir: Path = Path(".")):
    print("\nExporting...")
    output_dir.mkdir(parents=True, exist_ok=True)
    

    csv_path = output_dir / f"{filename_base}.csv"
    df.to_csv(csv_path, index=False)
    print(f"✓ Exported CSV to: {csv_path}")

    parquet_path = output_dir / f"{filename_base}.parquet"
    df.to_parquet(parquet_path, index=False)
    print(f"✓ Exported Parquet to: {parquet_path}")
