# DATABASE_SCHEMA.md

## Database: PostgreSQL

### users

id UUID PRIMARY KEY\
email TEXT UNIQUE\
password_hash TEXT\
created_at TIMESTAMP

------------------------------------------------------------------------

### contents

id UUID PRIMARY KEY\
user_id UUID REFERENCES users(id)\
type TEXT\
source_url TEXT\
status TEXT\
uploaded_at TIMESTAMP

------------------------------------------------------------------------

### analysis_results

id UUID PRIMARY KEY\
content_id UUID REFERENCES contents(id)\
raw_text TEXT\
language TEXT\
processed_at TIMESTAMP

------------------------------------------------------------------------

### summaries

id UUID PRIMARY KEY\
content_id UUID REFERENCES contents(id)\
summary_text TEXT\
model TEXT\
created_at TIMESTAMP

------------------------------------------------------------------------

### tags

id UUID PRIMARY KEY\
name TEXT UNIQUE

------------------------------------------------------------------------

### content_tags

content_id UUID REFERENCES contents(id)\
tag_id UUID REFERENCES tags(id)

PRIMARY KEY(content_id, tag_id)

------------------------------------------------------------------------

### processing_jobs

id UUID PRIMARY KEY\
content_id UUID REFERENCES contents(id)\
status TEXT\
step TEXT\
created_at TIMESTAMP\
updated_at TIMESTAMP
