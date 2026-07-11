---
course: "introduction-to-database"
topic: "Joins"
order: 2
cards:
  - q: "What does a JOIN do?"
    a: "Combines rows from two or more tables based on a related column between them."
  - q: "What does an INNER JOIN return?"
    a: "Only rows that have matching values in both tables."
  - q: "How does a LEFT JOIN differ from an INNER JOIN?"
    a: "It returns all rows from the left table plus matches from the right; unmatched right-side columns are NULL."
  - q: "What column do you usually join two tables on?"
    a: "A key relationship — typically a foreign key in one table matching the primary key of the other."
  - q: "What happens if you forget the join condition (ON clause)?"
    a: "Conceptually you'd get a Cartesian product — every row of one table paired with every row of the other. Most engines require an ON clause, so use CROSS JOIN explicitly when you actually want that."
---
