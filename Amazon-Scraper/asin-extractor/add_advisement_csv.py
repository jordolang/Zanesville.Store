import csv
import io

# Define the advisement text
advisement = " - ADVISEMENT: This item was extracted from invoices by artificial intelligence and referenced to known Amazon listings by auction title only. The item you purchase may be entirely different from what is shown in the photo if you do not verify the item with the seller first. Ask the seller to visually verify the item and perform the same inspection upon purchase. Most items are purchased from auction and retained in their original box, unopened until final receipt. The seller is not responsible for any refunds after purchase if the item received doesn't match the listing photo. Always verify with the seller that they are 100% certain their inventory matches this listing before purchase."

# Read the CSV file
rows = []
with open('auction-items_enriched.csv', 'r', encoding='utf-8') as file:
    reader = csv.reader(file)
    for row in reader:
        rows.append(row)

# Process each row
for i, row in enumerate(rows):
    if i == 0:  # Skip header row
        continue
    
    if len(row) >= 3:  # Make sure we have at least 3 columns (including description)
        description = row[2].strip()  # Description is the 3rd column (index 2)
        
        # Check if there's a description and it doesn't already have the advisement
        if description and 'ADVISEMENT:' not in description:
            # Add the advisement to the description
            row[2] = description + advisement

# Write back to file
with open('auction-items_enriched.csv', 'w', encoding='utf-8', newline='') as file:
    writer = csv.writer(file)
    writer.writerows(rows)

print("Successfully added advisement to all item descriptions!")
