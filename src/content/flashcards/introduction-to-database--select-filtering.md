---
course: "introduction-to-database"
topic: "SELECT & Filtering"
order: 1
cards:
  - q: "What does a `SELECT` statement do?"
    a: "Retrieves rows and columns from one or more tables."
  - q: "What does the `WHERE` clause do?"
    a: "Filters rows to only those matching a condition."
  - q: "How do you sort query results?"
    a: "With `ORDER BY column [ASC|DESC]` — ascending by default."
  - q: "What does `SELECT *` mean, and why avoid it in production?"
    a: "It returns every column; naming columns explicitly is clearer, more stable, and can be faster."
  - q: "What's the difference between `WHERE` and `HAVING`?"
    a: "WHERE filters individual rows before grouping; HAVING filters groups after GROUP BY."
---
