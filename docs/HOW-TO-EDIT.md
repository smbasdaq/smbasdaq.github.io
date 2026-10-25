# How to update the website (no coding needed)

Everything on the website comes from two Excel files in the **data** folder:

| File | What it holds |
|---|---|
| **Asdaq_Publications.xlsx** | Research themes and all publications (one tab per theme) |
| **Asdaq_Profile.xlsx** | About text, experience, education, honours, grants, patents, metrics, languages, emails, links |

## To change something
1. Open the Excel file and go to the right tab (the tab names match the website sections).
2. Edit the text in the cell, or add a new row at the bottom of the list.
3. **Save** (Ctrl + S).
4. Refresh the website in the browser (F5). The change appears.

## Adding a publication
Open **Asdaq_Publications.xlsx**, choose the theme tab, and add a row:
* **Year** – e.g. 2026
* **Title**, **Authors**, **Journal** – as in the paper
* **DOI** – only the code, e.g. `10.3390/ph17091221` (not the full link)
* **Show on Site** – Yes
Volume, Issue, Pages and Citations are optional.

## Good to know
* Lists are sorted automatically, newest year first. Rows with no year go to the end.
* To hide something without deleting it, set **Show** (or **Show on Site**) to **No**.
* To move a paper to another theme, cut the whole row and paste it into the other theme's tab.
* Please don't rename the tabs or the column headings in row 1.
* Yellow rows are notes for checking; you can clear the yellow once confirmed.

## Opening the website on this computer
Double-click **start-site.bat** in the website folder. It opens the site in your browser.
(It needs Python installed once: https://www.python.org/downloads/ — tick "Add Python to PATH" during setup.)
Keep the black window open while you use the site; close it when done.

## What updates by itself (every 90 days)
When the site is started with **start-site.bat** and 90 days have passed since the last update:
* Google Scholar citations, h-index and i10-index are refreshed.
* Every paper's citation count is refreshed. Old counts are kept in the **Citation History** tab.
* New papers published since the last update are added automatically to the most likely theme tab,
  highlighted **yellow** with Status "Auto-added – check theme". If the theme is wrong, cut the row and
  paste it into the right tab; then clear the yellow.
* Patents, honours, roles and other profile details are **not** fetched; add those by hand.
