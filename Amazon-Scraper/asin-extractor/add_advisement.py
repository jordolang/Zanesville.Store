import csv
import re

# Define the advisement text
advisement = " - ADVISEMENT: This item was extracted from invoices by artificial intelligence and referenced to known Amazon listings by auction title only. The item you purchase may be entirely different from what is shown in the photo if you do not verify the item with the seller first. Ask the seller to visually verify the item and perform the same inspection upon purchase. Most items are purchased from auction and retained in their original box, unopened until final receipt. The seller is not responsible for any refunds after purchase if the item received doesn't match the listing photo. Always verify with the seller that they are 100% certain their inventory matches this listing before purchase."

# Read the CSV file
with open('auction-items_enriched.csv', 'r', encoding='utf-8') as file:
    content = file.read()

# Split into lines
lines = content.strip().split('\n')

# Process each line
updated_lines = []
for i, line in enumerate(lines):
    if i == 0:  # Header line
        updated_lines.append(line)
        continue
    
    # Split the line by | to get the fields
    fields = line.split('|')
    
    if len(fields) >= 3:  # Make sure we have at least 3 fields (including description)
        description = fields[2]  # Description is the 3rd field (index 2)
        
        # Check if description is not empty and doesn't already contain the advisement
        if description.strip() and 'ADVISEMENT:' not in description:
            # Add advisement to the description
            if description.strip() == '':  # Empty description
                description = advisement[3:]  # Remove the ' - ' prefix
            else:
                description = description + advisement
            
            # Update the field
            fields[2] = description
    
    # Rejoin the fields
    updated_line = '|'.join(fields)
    updated_lines.append(updated_line)

# Write the updated content back to the file
with open('auction-items_enriched.csv', 'w', encoding='utf-8') as file:
    file.write('\n'.join(updated_lines))

print("Advisement added to all item descriptions successfully!")
