from pathlib import Path
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw'
OUT=ROOT/'data/processed'
OUT.mkdir(exist_ok=True)
rows=[]
for f in sorted(RAW.glob('*.csv')):
    df=pd.read_csv(f)
    rows.append({'file':f.name,'rows':len(df),'columns':len(df.columns),'missing_cells':int(df.isna().sum().sum()),'duplicate_rows':int(df.duplicated().sum()),'size_bytes':f.stat().st_size})
    pd.DataFrame({'column':df.columns,'dtype':[str(x) for x in df.dtypes],'missing':[int(df[c].isna().sum()) for c in df.columns],'unique':[int(df[c].nunique(dropna=True)) for c in df.columns]}).to_csv(OUT/(f.stem+'_dictionary.csv'),index=False)
pd.DataFrame(rows).to_csv(OUT/'data_audit_summary.csv',index=False)
print(pd.DataFrame(rows).to_string(index=False))
