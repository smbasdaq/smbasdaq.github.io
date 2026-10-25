/*
  WHERE THE SITE READS ITS DATA FROM
  ----------------------------------
  source: "excel"  -> reads the two Excel files in data/ (default; for running on your computer)
                      Edit data/Asdaq_Publications.xlsx or data/Asdaq_Profile.xlsx in Excel, save, refresh the page.
  source: "sheets" -> reads live from Google Sheets (for the online site; see docs/SOP-google-sheets.md)
  source: "csv"    -> reads data/csv/*.csv (only if you prefer CSV files)

  To switch to Google Sheets:
    1. Upload both Excel files to Google Drive and open each with File > Save as Google Sheets.
    2. Share each Google Sheet: General access = "Anyone with the link" (Viewer).
    3. Copy the ID from each sheet's address bar: https://docs.google.com/spreadsheets/d/  THIS_LONG_ID  /edit
    4. Paste the IDs below and set source to "sheets".
  Tab names and column headings must stay exactly as they are.
*/
window.SITE_CONFIG = {
  source: "sheets",

  excel: {
    publications: "data/Asdaq_Publications.xlsx",
    profile: "data/Asdaq_Profile.xlsx"
  },

  sheets: {
    publicationsId: "1jvSwGfHIs03pDiW7C_mBn9CwK1QIyX7HwgjBfSFLjwE",
    profileId: "1YotZBevudLM0cHgZtnudn4NSi-PBkuUPaUGrVYPxJ38"
  },

  // Name to highlight in author lists
  highlightAuthor: /(Syed Mohammed Basheeruddin Asdaq|S\.?\s?M\.?\s?B\.?\s?Asdaq|Asdaq,?\s?S\.?\s?M\.?\s?B?\.?|Basheeruddin Asdaq|Asdaq SM[B]?|Asdaq)/g,

  // Publications shown per "Show more" click
  pageSize: 25
};
