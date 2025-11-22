import csv
import re

# Define the advisement text
advisement = " - ADVISEMENT: This item was extracted from invoices by artificial intelligence and referenced to known Amazon listings by auction title only. The item you purchase may be entirely different from what is shown in the photo if you do not verify the item with the seller first. Ask the seller to visually verify the item and perform the same inspection upon purchase. Most items are purchased from auction and retained in their original box, unopened until final receipt. The seller is not responsible for any refunds after purchase if the item received doesn't match the listing photo. Always verify with the seller that they are 100% certain their inventory matches this listing before purchase."

# Read the original file
with open('auction-items_enriched.csv', 'r', encoding='utf-8') as file:
    content = file.read()

# Process the content by treating each line as a pipe-delimited record
lines = content.strip().split('\n')
updated_lines = []

for i, line in enumerate(lines):
    if i == 0:  # Skip header line
        updated_lines.append(line)
        continue
    
    # Split by pipe delimiter
    parts = line.split('|')
    
    if len(parts) >= 3:  # Ensure we have at least 3 parts (including description)
        # The description is in the 3rd position (index 2)
        description = parts[2].strip()
        
        # Check if there's a description and it doesn't already have the advisement
        if description and 'ADVISEMENT:' not in description:
            # Add the advisement to the description
            parts[2] = description + advisement
        
        # Rebuild the line
        updated_line = '|'.join(parts)
        updated_lines.append(updated_line)
    else:
        updated_lines.append(line)

# Write back to file
with open('auction-items_enriched.csv', 'w', encoding='utf-8') as file:
    file.write('\n'.join(updated_lines))

print("Successfully added advisement to all item descriptions!")
