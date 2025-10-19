Public fd As FileDialog, valfile, exportloc, targetwb, srcwb, actsheet As String, fstrow, lstrow, lr2 As Integer, mainsheets As Variant

Sub ImportSheets()

Sheets("Home").Select

Application.ScreenUpdating = False

Application.Calculation = xAutomatic

targetwb = ThisWorkbook.Name
Set fd = Application.FileDialog(msoFileDialogOpen)
fd.Title = "Choose Report Data"
fd.AllowMultiSelect = False
If fd.Show = True Then
valfile = fd.SelectedItems(1)
Application.DisplayAlerts = False
Application.AskToUpdateLinks = False
Workbooks.Open (valfile)
Workbooks(targetwb).Activate
srcwb = Dir(valfile)
Else
MsgBox ("No file Chosen")
Exit Sub
End If
Windows(targetwb).Activate
Windows(srcwb).Activate
Sheets(1).Activate

Workbooks(srcwb).Sheets(1).Copy After:=Workbooks(targetwb).Sheets("Home")
ActiveSheet.Name = "Sheet1"

Workbooks(srcwb).Close False

Windows(targetwb).Activate
On Error Resume Next

actsheet = Sheets("Key").Cells(x + 1, 11)

Sheets(actsheet).Activate
ActiveSheet.ShowAllData
ActiveSheet.UsedRange.Value = ActiveSheet.UsedRange.Value
        

Sheets("Home").Activate

Application.ScreenUpdating = True

MsgBox "Import complete!"

End Sub

Sub Data_Manipulation()
    Dim ws As Worksheet, wsNew As Worksheet
    Dim lastRow As Long
    Dim benefitDescCol As Range
    Dim benefitCategoryCol As Range
    Dim benefitDesc As String
    Dim category As String
    Dim i As Long
    
    ' Set the worksheet (adjust "Sheet1" to your actual sheet name)
    Set ws = ThisWorkbook.Sheets("Sheet1")
    
    ' Delete columns by their names
    Dim colNames As Variant
    colNames = Array("INTEG MEMBER NUMBER", "OTHER NUMBER", "OFFICE BRANCH", "CARD SERIAL", "CAT CODE", _
                     "POOL NUMBER", "INVOICE NUMBER", "BILLING ID", "LOCAL CONVERSION RATE", _
                     "POLICY CONVERSION RATE", "IS ROAMER CLAIM", "ROAMER AMOUNT", "ACTIONED_BY", _
                     "COMMENT", "INSURANCE SPLIT AMOUNT", "MEMBER SPLIT AMOUNT", "GLOBAL INVOICE NUMBER", _
                     "PRINCIPAL NAMES", "PRINCIPAL MEMBER NUMBER", "PRINCIPAL OTHER NUMBER", "RELATIONSHIP TO PRINCIPAL", _
                     "PHONE NUMBER", "PHONE NUMBER2", "PARENT POOL", "PARENT POOL DESCRIPTION")
    
    Dim colName As Variant
    Dim rng As Range
    On Error Resume Next
    For Each colName In colNames
        Set rng = ws.Rows(1).Find(colName, , xlValues, xlWhole)
        If Not rng Is Nothing Then
            ws.Columns(rng.Column).Delete
        End If
    Next colName
    On Error GoTo 0
    
    ' Find the DOB column and insert Age Bands
    Dim dobCol As Range
    Set dobCol = ws.Rows(1).Find("DOB", , xlValues, xlWhole)
    
    If Not dobCol Is Nothing Then
        ws.Cells(1, dobCol.Column + 1).Value = "Age Bands"
        
        ' Calculate Age and categorize into bands
        lastRow = ws.Cells(ws.Rows.Count, dobCol.Column).End(xlUp).Row
        For i = 2 To lastRow
            Dim age As Long
            If IsDate(ws.Cells(i, dobCol.Column).Value) Then
                age = DateDiff("yyyy", ws.Cells(i, dobCol.Column).Value, Date)
                ' Adjust if birthday hasn't occurred yet this year
                If Date < DateSerial(Year(Date), Month(ws.Cells(i, dobCol.Column).Value), Day(ws.Cells(i, dobCol.Column).Value)) Then
                    age = age - 1
                End If
                
                If age <= 17 Then
                    ws.Cells(i, dobCol.Column + 1).Value = "0-17"
                ElseIf age <= 35 Then
                    ws.Cells(i, dobCol.Column + 1).Value = "18-35"
                ElseIf age <= 55 Then
                    ws.Cells(i, dobCol.Column + 1).Value = "36-55"
                Else
                    ws.Cells(i, dobCol.Column + 1).Value = "55+"
                End If
            Else
                ws.Cells(i, dobCol.Column + 1).Value = "N/A"
            End If
        Next i
    End If
  
    ' Find the BENEFIT DESC column and insert Benefits column
    Set benefitDescCol = ws.Rows(1).Find("BENEFIT DESC", , xlValues, xlWhole)

    If Not benefitDescCol Is Nothing Then
        benefitDescCol.Offset(0, 1).EntireColumn.Insert
        ws.Cells(1, benefitDescCol.Column + 1).Value = "Benefits"
        
        ' Loop through each row to assign categories based on "BENEFIT DESC"
        For i = 2 To lastRow
            benefitDesc = ws.Cells(i, benefitDescCol.Column).Value
            category = "" ' Reset category for each row
            
            Select Case True
                Case InStr(benefitDesc, "IN PATIENT") > 0
                    If InStr(benefitDesc, "CHRONIC") > 0 Or InStr(benefitDesc, "PRE-EXISTING") > 0 Then
                        category = "Chronic IP"
                    ElseIf InStr(benefitDesc, "DENTAL") > 0 Then
                        category = "Inpatient"
                    ElseIf InStr(benefitDesc, "OPTICAL") > 0 Then
                        category = "Inpatient"
                    ElseIf InStr(benefitDesc, "MATERNITY") > 0 Then
                        category = "Maternity"
                    ElseIf InStr(benefitDesc, "ANTENATAL") > 0 Then
                        category = "Maternity"
                    Else
                        category = "Inpatient"
                    End If
                    
                Case InStr(benefitDesc, "OUTPATIENT") > 0 Or InStr(benefitDesc, "OUT PATIENT") > 0
                    If InStr(benefitDesc, "(INCLUSIVE OF") > 0 Then
                        category = "Outpatient"
                    ElseIf InStr(benefitDesc, "OPTICAL") > 0 Then
                        category = "Optical"
                    ElseIf InStr(benefitDesc, "CHRONIC") > 0 Or InStr(benefitDesc, "PRE-EXISTING") > 0 Then
                        category = "Chronic OP"
                    ElseIf InStr(benefitDesc, "MATERNITY") > 0 Then
                        category = "Maternity"
                    ElseIf InStr(benefitDesc, "DENTAL") > 0 Then
                        category = "Dental"
                    Else
                        category = "Outpatient"
                    End If
                
                Case InStr(benefitDesc, "MATERNITY") > 0 Or InStr(benefitDesc, "ANTENATAL") > 0
                    category = "Maternity"
                
                Case Left(benefitDesc, 6) = "DENTAL"
                    category = "Dental"
                    
                Case Left(benefitDesc, 7) = "OPTICAL"
                    category = "Optical"
                
                Case Else
                    category = "Outpatient"
            End Select
            ws.Cells(i, benefitDescCol.Column + 1).Value = category
        Next i
    End If

    ' Find the MEMBER NUMBER column and insert Relationships column
    Dim memberNumberCol As Range
    Set memberNumberCol = ws.Rows(1).Find("MEMBER NUMBER", , xlValues, xlWhole)
    
    If Not memberNumberCol Is Nothing Then
        memberNumberCol.Offset(0, 1).EntireColumn.Insert
        memberNumberCol.Offset(0, 1).Value = "Relationships"
        
        For i = 2 To lastRow
            Dim memberNumber As String
            memberNumber = ws.Cells(i, memberNumberCol.Column).Value
            
            If Right(memberNumber, 2) = "00" Then
                ws.Cells(i, memberNumberCol.Column + 1).Value = "Principal"
            Else
                ws.Cells(i, memberNumberCol.Column + 1).Value = "Dependant"
            End If
        Next i
    End If
    
    ' Convert PROVIDER NAME to Proper Case
    Dim providerNameCol As Range
    Set providerNameCol = ws.Rows(1).Find("PROVIDER NAME", , xlValues, xlWhole)
    
    If Not providerNameCol Is Nothing Then
        lastRow = ws.Cells(ws.Rows.Count, providerNameCol.Column).End(xlUp).Row
        
        For i = 2 To lastRow
            ws.Cells(i, providerNameCol.Column).Value = Application.WorksheetFunction.Proper(ws.Cells(i, providerNameCol.Column).Value)
        Next i
    End If
    
    ' Add a new column for Date from TRANSACTION DATE
    Dim transactionDateCol As Range
    Set transactionDateCol = ws.Rows(1).Find("TRANSACTION DATE", , xlValues, xlWhole)
    
    If Not transactionDateCol Is Nothing Then
        ws.Cells(1, ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column + 1).Value = "Date"
        lastRow = ws.Cells(ws.Rows.Count, transactionDateCol.Column).End(xlUp).Row
        For i = 2 To lastRow
            If IsDate(ws.Cells(i, transactionDateCol.Column).Value) Then
                ws.Cells(i, ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column).Value = Format(ws.Cells(i, transactionDateCol.Column).Value, "mmm-yyyy")
            Else
                ws.Cells(i, ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column).Value = "N/A"
            End If
        Next i
    End If

    ' Duplicate Sheet1 and rename to "visits"
    ws.Copy After:=ws
    Set wsNew = ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count)
    wsNew.Name = "visits"
    
    ' Add Duplicates column
    Dim duplicatesCol As Long
    duplicatesCol = wsNew.Cells(1, wsNew.Columns.Count).End(xlToLeft).Column + 1
    wsNew.Cells(1, duplicatesCol).Value = "Duplicates"
    
    For i = 2 To lastRow
        wsNew.Cells(i, duplicatesCol).Value = wsNew.Cells(i, memberNumberCol.Column).Value & _
                                              wsNew.Cells(i, transactionDateCol.Column).Value & _
                                              wsNew.Cells(i, providerNameCol.Column).Value & _
                                              wsNew.Cells(i, benefitDescCol.Column + 1).Value
    Next i
    
    ' Remove duplicates based on Duplicates column
    wsNew.Range("A1").CurrentRegion.RemoveDuplicates Columns:=duplicatesCol, Header:=xlYes

    Sheets("Home").Activate
    Range("A1").Select


    MsgBox "Data manipulation completed!"
End Sub



Sub Benefits()
    On Error GoTo ErrorHandler

    Dim ws As Worksheet
    Dim pt As PivotTable
    Dim ptCache As PivotCache
    Dim dataRange As Range
    Dim lastRow As Long, lastCol As Long
    Dim dataSheet As Worksheet
    Dim secondPivotRow As Long
    Dim secondPt As PivotTable
    Dim thirdPt As PivotTable
    Dim thirdPivotRow As Long

    ' Assuming your data is in "Sheet1"
    Set dataSheet = Worksheets("Sheet1")

    ' Find the last row and last column of data
    lastRow = dataSheet.Cells(dataSheet.Rows.Count, 1).End(xlUp).Row
    lastCol = dataSheet.Cells(1, dataSheet.Columns.Count).End(xlToLeft).Column

    ' Set the data range
    Set dataRange = dataSheet.Range(dataSheet.Cells(1, 1), dataSheet.Cells(lastRow, lastCol))

    ' Delete the "Benefits Usage" sheet if it already exists
    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("Benefits Usage").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    ' Add the new worksheet for Benefits Usage
    Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count))
    ws.Name = "Benefits Usage"
    
    ' Set the tab color to navy blue
    With ws.Tab
        .ThemeColor = xlThemeColorDark1
        .TintAndShade = -0.499984740745262
    End With


    ' Create Pivot Cache for Benefits Usage
    Set ptCache = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=dataRange.Address(ReferenceStyle:=xlR1C1, External:=True))
    Set pt = ptCache.CreatePivotTable(TableDestination:=ws.Range("B2"), TableName:="BenefitsUsagePivotTable")  ' Fixed the typo
    
    ' Set up the Pivot Table fields for Benefits Usage
    With pt
        .PivotFields("Date").Orientation = xlRowField
        .PivotFields("Benefits").Orientation = xlColumnField
        .PivotFields("AMOUNT").Orientation = xlDataField
        .PivotFields("AMOUNT").NumberFormat = "#,##0.00"
    End With

    ' Copy the entire PivotTable and paste as values
    ws.Range("B2").CurrentRegion.Copy
    ws.Range("B2").PasteSpecial Paste:=xlPasteValues
    
    Application.CutCopyMode = False

    ' Delete the second row
    ws.Rows(2).Delete
    ' Change the Row title in B2 to "Benefits"
    ws.Range("B2").Value = "Month"
    
    Call FillBlanks
    
  
    ' Hide gridlines
    ws.Activate
    ActiveWindow.DisplayGridlines = False
    
    ' Format headers for Benefits Usage
    With ws.Rows(2).Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With
   
    ' Format totals row for Benefits Usage
    Dim pivotTableRow As Long
    pivotTableRow = ws.Cells(Rows.Count, 2).End(xlUp).Row
    With ws.Cells(pivotTableRow - 1, 2).EntireRow.Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With
    
    ws.Rows(pivotTableRow).Delete
    ws.Columns.AutoFit

    ' Set active cell to A1 on Benefits Usage
    ws.Range("A1").Select
    ws.Range("B:B").NumberFormat = "mmm-yyyy"
    
    
    
     ' Add Visits column header for Member Usage
    Dim visitsCol As Long
    visitsCol = ws.Cells(2, ws.Columns.Count).End(xlToLeft).Column + 1
    ws.Cells(2, visitsCol).Value = "Visits"

    ' Count the number of CLAIM IDs for each MEMBER NUMBER
    Dim memberRange As Range
    Dim i As Long
    Set memberRange = ws.Range("B3:B" & ws.Cells(ws.Rows.Count, 2).End(xlUp).Row)

    ' Loop through each MEMBER NUMBER and create COUNTIF formula
    For i = 3 To memberRange.Rows.Count + 2
        ws.Cells(i, visitsCol).Formula = "=COUNTIF(visits!T:T, " & ws.Cells(i, 2).Address & ")"
    Next i
    
    ' Copy the entire Visits column (containing COUNTIF formulas)
    ws.Range(ws.Cells(3, visitsCol), ws.Cells(memberRange.Rows.Count + 2, visitsCol)).Copy
    ' Paste the values back to the same range to replace formulas with values
    ws.Range(ws.Cells(3, visitsCol), ws.Cells(memberRange.Rows.Count + 2, visitsCol)).PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False



     ' Set the last cell in the Visits column to sum the values above it
    lastRow = ws.Cells(ws.Rows.Count, visitsCol).End(xlUp).Row
    ws.Cells(lastRow, visitsCol).Formula = "=SUM(" & ws.Cells(3, visitsCol).Address & ":" & ws.Cells(lastRow - 1, visitsCol).Address & ")"



    
    ' Calculate Average Costs for Member Usage
    Dim averageCostsCol As Long
    averageCostsCol = visitsCol + 1
    ws.Cells(2, averageCostsCol).Value = "Average Costs"

    For i = 3 To memberRange.Rows.Count + 2
    ws.Cells(i, averageCostsCol).Formula = "=IFERROR(" & ws.Cells(i, visitsCol - 1).Address & "/" & ws.Cells(i, visitsCol).Address & ", 0)"
Next i

    
    
    
    
    ' Calculate Percentage for Member Usage
Dim percentageCol As Long
Dim totalCol As Long
Dim totalValue As Double
Dim lastRows As Long

' Column for percentages is just after the Average Costs column
percentageCol = averageCostsCol + 1
ws.Cells(2, percentageCol).Value = "Percentage"

' Column to the left of Average Costs (2 columns to the left)
totalCol = averageCostsCol - 2

' Find the last row of the data
lastRows = ws.Cells(ws.Rows.Count, totalCol).End(xlUp).Row - 1

' Calculate the total of the column two places to the left of Average Costs
totalValue = Application.WorksheetFunction.Sum(ws.Range(ws.Cells(3, totalCol), ws.Cells(lastRows, totalCol)))

' Compute percentages: (value 2 columns left of averageCostsCol) / totalValue
For i = 3 To lastRows
    If totalValue <> 0 Then
        ws.Cells(i, percentageCol).Formula = "=" & ws.Cells(i, totalCol).Address & "/" & totalValue
    Else
        ws.Cells(i, percentageCol).Value = "N/A"  ' Handle case when totalValue is 0
    End If
Next i
    ' Optional: Formatting for Percentage column
    ws.Columns(percentageCol).NumberFormat = "0.0%"
     ws.Columns(averageCostsCol).NumberFormat = "#,##0"
    


    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    
     ws.Range("B2", ws.Cells(2, ws.Cells(2, ws.Columns.Count).End(xlToLeft).Column)).Borders(xlEdgeBottom).Weight = xlMedium

    ' Apply All Borders for Member Usage table
With ws.Range("B2").CurrentRegion.Borders
    .LineStyle = xlContinuous
    .Weight = xlThin
End With

    
    
    
    
  


      ' Formatting the sheet
    With ws.Cells
        .Font.Name = "Garamond"
        .Font.Size = 10
    End With

    ws.Columns.AutoFit

    ' Set active cell to A1 on Benefits Usage
    ws.Range("A1").Select
       Exit Sub
    
    
    
    

ErrorHandler:
    MsgBox "An error has occurred: " & Err.Description
End Sub

Sub SchemeReport()
    On Error GoTo ErrorHandler

    Dim ws As Worksheet
    Dim wsHospitals As Worksheet
    Dim pt As PivotTable
    Dim ptCache As PivotCache
    Dim dataRange As Range
    Dim lastRow As Long, lastCol As Long
    Dim dataSheet As Worksheet

    ' Assuming your data is in "Sheet1"
    Set dataSheet = Worksheets("Sheet1")

    ' Find the last row and last column of data
    lastRow = dataSheet.Cells(dataSheet.Rows.Count, 1).End(xlUp).Row
    lastCol = dataSheet.Cells(1, dataSheet.Columns.Count).End(xlToLeft).Column

    ' Set the data range
    Set dataRange = dataSheet.Range(dataSheet.Cells(1, 1), dataSheet.Cells(lastRow, lastCol))

    ' Delete the "Member Usage" sheet if it already exists
    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("Member Usage").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    ' Add the new worksheet for Member Usage
    Set ws = Worksheets.Add(After:=Worksheets(Worksheets.Count))
    ws.Name = "Member Usage"
    
    ' Set the tab color to navy blue
    With ws.Tab
        .ThemeColor = xlThemeColorDark1
        .TintAndShade = -0.249977111117893
    End With

    ' Create Pivot Cache for Member Usage
    Set ptCache = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=dataRange.Address(ReferenceStyle:=xlR1C1, External:=True))
    Set pt = ptCache.CreatePivotTable(TableDestination:=ws.Range("B2"), TableName:="MemberUsagePivotTable")
    
    ' Set up the Pivot Table fields for Member Usage
    With pt
        .PivotFields("MEMBER NUMBER").Orientation = xlRowField
        .PivotFields("Benefits").Orientation = xlColumnField
        .PivotFields("AMOUNT").Orientation = xlDataField
        .PivotFields("AMOUNT").NumberFormat = "#,##0.00"
    End With

    ' Copy the entire PivotTable and paste as values
    ws.Range("B2").CurrentRegion.Copy
    ws.Range("B2").PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False


    ' Apply All Borders for Member Usage table
    With ws.Range("B2").CurrentRegion.Borders
    .LineStyle = xlContinuous
    .Weight = xlThin
    End With

    
    
    ' Delete the second row
    ws.Rows(2).Delete
    ' Change the Row title in B2 to "Member No."
    ws.Range("B2").Value = "Member No."
    
    Call FillBlanks

    ' Formatting the sheet
    With ws.Cells
        .Font.Name = "Garamond"
        .Font.Size = 10
    End With

    ' Hide gridlines
    ws.Activate
    ActiveWindow.DisplayGridlines = False



   ' Add Visits column header for Member Usage
    Dim visitsCol As Long
    visitsCol = ws.Cells(2, ws.Columns.Count).End(xlToLeft).Column + 1
    ws.Cells(2, visitsCol).Value = "Visits"

    ' Count the number of CLAIM IDs for each MEMBER NUMBER
    Dim memberRange As Range
    Dim i As Long
    Set memberRange = ws.Range("B3:B" & ws.Cells(ws.Rows.Count, 2).End(xlUp).Row)

    ' Loop through each MEMBER NUMBER and create COUNTIF formula
    For i = 3 To memberRange.Rows.Count + 1
        If i < memberRange.Rows.Count + 1 Then
            ws.Cells(i, visitsCol).Formula = "=COUNTIF(visits!E:E, " & ws.Cells(i, 2).Address & ")"
        End If
    Next i
    
    ' Set the last cell in the Visits column to sum the values above it
    lastRow = ws.Cells(ws.Rows.Count, visitsCol).End(xlUp).Row
    ws.Cells(lastRow + 1, visitsCol).Formula = "=SUM(" & ws.Cells(3, visitsCol).Address & ":" & ws.Cells(lastRow, visitsCol).Address & ")"

    

    ' Replace formulas with their calculated values directly for the visits column
    For i = 3 To memberRange.Rows.Count + 2
        ws.Cells(i, visitsCol).Value = ws.Cells(i, visitsCol).Value
    Next i
    
    
    ' Copy the entire Visits column (containing COUNTIF formulas)
    ws.Range(ws.Cells(3, visitsCol), ws.Cells(memberRange.Rows.Count + 2, visitsCol)).Copy
    ' Paste the values back to the same range to replace formulas with values
    ws.Range(ws.Cells(3, visitsCol), ws.Cells(memberRange.Rows.Count + 2, visitsCol)).PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False

    ' Calculate Average Costs for Member Usage
    Dim averageCostsCol As Long
    averageCostsCol = visitsCol + 1
    ws.Cells(2, averageCostsCol).Value = "Average Costs"

   For i = 3 To memberRange.Rows.Count + 2
    ws.Cells(i, averageCostsCol).Formula = "=IFERROR(" & ws.Cells(i, visitsCol - 1).Address & "/" & ws.Cells(i, visitsCol).Address & ", 0)"
Next i


    ' Get the number format from the grand total column
    Dim grandTotalNumberFormat As String
    grandTotalNumberFormat = ws.Cells(3, visitsCol - 1).NumberFormat
    ws.Columns(averageCostsCol).NumberFormat = grandTotalNumberFormat

    ' Calculate Percentage for Member Usage
Dim percentageCol As Long
Dim totalCol As Long
Dim totalValue As Double
Dim lastRows As Long

' Column for percentages is just after the Average Costs column
percentageCol = averageCostsCol + 1
ws.Cells(2, percentageCol).Value = "Percentage"

' Column to the left of Average Costs (2 columns to the left)
totalCol = averageCostsCol - 2

' Find the last row of the data
lastRows = ws.Cells(ws.Rows.Count, totalCol).End(xlUp).Row - 1

' Calculate the total of the column two places to the left of Average Costs
totalValue = Application.WorksheetFunction.Sum(ws.Range(ws.Cells(3, totalCol), ws.Cells(lastRows, totalCol))) / 2

' Compute percentages: (value 2 columns left of averageCostsCol) / totalValue
For i = 3 To lastRows
    If totalValue <> 0 Then
        ws.Cells(i, percentageCol).Formula = "=" & ws.Cells(i, totalCol).Address & "/" & totalValue
    Else
        ws.Cells(i, percentageCol).Value = "N/A"  ' Handle case when totalValue is 0
    End If
Next i
    ' Optional: Formatting for Percentage column
    ws.Columns(percentageCol).NumberFormat = "0.0%"
    

    

    ' Format headers for Member Usage
    With ws.Rows(2).Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With
    ws.Range("B2", ws.Cells(2, ws.Cells(2, ws.Columns.Count).End(xlToLeft).Column)).Borders(xlEdgeBottom).Weight = xlMedium

    ' Format totals row for Member Usage
    Dim pivotTableRow As Long
    pivotTableRow = ws.Cells(Rows.Count, 2).End(xlUp).Row
    With ws.Cells(pivotTableRow - 1, 2).EntireRow.Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With
    ws.Rows(pivotTableRow).Delete

    
    ws.Columns.AutoFit

    ' ---- Begin Hospitals Usage section ------------------------------------------****************-------------------------------------------------
    ' Delete the "Hospitals Usage" sheet if it already exists
    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("Hospitals Usage").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    ' Add the new worksheet for Hospitals Usage
    Set wsHospitals = Worksheets.Add(After:=Worksheets(Worksheets.Count))
    wsHospitals.Name = "Hospitals Usage"
    
    ' Set the tab color to bright red
    With wsHospitals.Tab
        .ThemeColor = xlThemeColorDark1
        .TintAndShade = -0.349986266670736
    End With

    ' Create Pivot Cache for Hospitals Usage
    Set ptCache = ThisWorkbook.PivotCaches.Create(SourceType:=xlDatabase, SourceData:=dataRange.Address(ReferenceStyle:=xlR1C1, External:=True))
    Set pt = ptCache.CreatePivotTable(TableDestination:=wsHospitals.Range("B2"), TableName:="HospitalsUsagePivotTable")

    ' Set up the Pivot Table fields for Hospitals Usage
    With pt
        .PivotFields("PROVIDER NAME").Orientation = xlRowField ' Adjust field names as necessary
        .PivotFields("AMOUNT").Orientation = xlDataField
        .PivotFields("AMOUNT").NumberFormat = "#,##0.00"
    End With

    ' Copy the entire PivotTable and paste as values
    wsHospitals.Range("B2").CurrentRegion.Copy
    wsHospitals.Range("B2").PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False


    ' Apply All Borders for Member Usage table
   With ws.Range("B2").CurrentRegion.Borders
    .LineStyle = xlContinuous
    .Weight = xlThin
   End With

    
    
    ' Delete the second row
    wsHospitals.Rows(2).Delete
    ' Change the Row title in B2 to "Hospital Name."
    wsHospitals.Range("B2").Value = "Hospital Name."
    wsHospitals.Range("C2").Value = "Total Claims"

    Call FillBlanks

    ' Formatting the sheet
    With wsHospitals.Cells
        .Font.Name = "Garamond"
        .Font.Size = 10
    End With

    ' Hide gridlines
    wsHospitals.Activate
    ActiveWindow.DisplayGridlines = False

  
   ' Add Visits column header for Hospitals Usage
    visitsCol = wsHospitals.Cells(2, wsHospitals.Columns.Count).End(xlToLeft).Column + 1
    wsHospitals.Cells(2, visitsCol).Value = "Visits"

    ' Count the number of CLAIM IDs for each HOSPITAL NAME
    Set memberRange = wsHospitals.Range("B3:B" & wsHospitals.Cells(wsHospitals.Rows.Count, 2).End(xlUp).Row)

    ' Loop through each HOSPITAL NAME and create COUNTIF formula
    For i = 3 To memberRange.Rows.Count + 2
        wsHospitals.Cells(i, visitsCol).Formula = "=COUNTIF(visits!O:O, " & wsHospitals.Cells(i, 2).Address & ")" ' Adjust column references as necessary
    Next i

    ' Copy the entire Visits column (containing COUNTIF formulas)
    wsHospitals.Range(wsHospitals.Cells(3, visitsCol), wsHospitals.Cells(memberRange.Rows.Count + 2, visitsCol)).Copy
    ' Paste the values back to the same range to replace formulas with values
    wsHospitals.Range(wsHospitals.Cells(3, visitsCol), wsHospitals.Cells(memberRange.Rows.Count + 2, visitsCol)).PasteSpecial Paste:=xlPasteValues
    Application.CutCopyMode = False
  
  
    ' Set the last cell in the Visits column to sum the values above it
    lastRow = wsHospitals.Cells(wsHospitals.Rows.Count, visitsCol).End(xlUp).Row
    wsHospitals.Cells(lastRow, visitsCol).Formula = "=SUM(" & wsHospitals.Cells(3, visitsCol).Address & ":" & wsHospitals.Cells(lastRow - 1, visitsCol).Address & ")"

  

    ' Calculate Average Costs for Hospitals Usage
    averageCostsCol = visitsCol + 1
    wsHospitals.Cells(2, averageCostsCol).Value = "Average Costs"

    For i = 3 To memberRange.Rows.Count + 2
    wsHospitals.Cells(i, averageCostsCol).Formula = "=IFERROR(" & wsHospitals.Cells(i, visitsCol - 1).Address & "/" & wsHospitals.Cells(i, visitsCol).Address & ", 0)"
Next i


    ' Get the number format from the grand total column
    grandTotalNumberFormat = wsHospitals.Cells(3, visitsCol - 1).NumberFormat
    wsHospitals.Columns(averageCostsCol).NumberFormat = grandTotalNumberFormat

       ' Calculate Percentage for Member Usage
Dim percentageCols As Long
Dim totalCols As Long
Dim totalValues As Double
Dim lastRowss As Long

' Column for percentages is just after the Average Costs column
percentageCols = averageCostsCol + 1
wsHospitals.Cells(2, percentageCols).Value = "Percentage"

' Column to the left of Average Costs (2 columns to the left)
totalCols = averageCostsCol - 2

' Find the last row of the data
lastRowss = wsHospitals.Cells(wsHospitals.Rows.Count, totalCols).End(xlUp).Row

' Calculate the total of the column two places to the left of Average Costs
totalValues = Application.WorksheetFunction.Sum(wsHospitals.Range(wsHospitals.Cells(3, totalCols), wsHospitals.Cells(lastRowss, totalCols))) / 2

' Compute percentages: (value 2 columns left of averageCostsCol) / totalValue
For i = 3 To lastRowss
    If totalValues <> 0 Then
        wsHospitals.Cells(i, percentageCols).Formula = "=" & wsHospitals.Cells(i, totalCols).Address & "/" & totalValue
    Else
        wsHospitals.Cells(i, percentageCols).Value = "N/A"  ' Handle case when totalValue is 0
    End If
Next i
    ' Optional: Formatting for Percentage column
    wsHospitals.Columns(percentageCols).NumberFormat = "0.0%"

    
    
    
    
    ' Format headers for Hospitals Usage
    With wsHospitals.Rows(2).Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With
    wsHospitals.Range("B2", wsHospitals.Cells(2, wsHospitals.Cells(2, wsHospitals.Columns.Count).End(xlToLeft).Column)).Borders(xlEdgeBottom).Weight = xlMedium

    ' Format totals row for Hospitals Usage
    pivotTableRow = wsHospitals.Cells(Rows.Count, 2).End(xlUp).Row
    With wsHospitals.Cells(pivotTableRow - 1, 2).EntireRow.Font
        .Bold = True
        .Color = RGB(0, 0, 128)
    End With

    wsHospitals.Rows(pivotTableRow).Delete
    wsHospitals.Columns.AutoFit

     ' Apply All Borders for Member Usage table
   With wsHospitals.Range("B2").CurrentRegion.Borders
    .LineStyle = xlContinuous
    .Weight = xlThin
   End With



    ' Set active cell to A1 on Member Usage
    ws.Activate
    ws.Range("A1").Select

    ' Set active cell to A1 on Hospitals Usage
    wsHospitals.Activate
    wsHospitals.Range("A1").Select
    
    Call Benefits
    Call LossRatio
    
    Application.DisplayAlerts = False
    Worksheets("Sheet1").Delete
    Application.DisplayAlerts = True
    
    Application.DisplayAlerts = False
    Worksheets("visits").Delete
    Application.DisplayAlerts = True
    
    
    MsgBox "Report is Ready!"
    
    Exit Sub

ErrorHandler:
    MsgBox "An error has occurred: " & Err.Description
End Sub

 Sub FillBlanks()
'
'
' Keyboard Shortcut: Ctrl+Shift+G
'
    'Application.ScreenUpdating = False
    With Selection.Font
        .Name = "Calibri"
        .Size = 10
    End With
    Selection.Style = "Comma"
    Selection.NumberFormat = "_-* #,##0_-;-* #,##0_-;_-* ""-""??_-;_-@_-"
           
    For Each cell In Selection
    If IsEmpty(cell) Then
    cell.Value = 0
    Else
    End If
    Next
    'Application.ScreenUpdating = True
    Range("A1").Select
     
End Sub




Function IsInArray(valToCheck As String, arr As Variant) As Boolean
    Dim element As Variant
    For Each element In arr
        If StrComp(valToCheck, element, vbTextCompare) = 0 Then
            IsInArray = True
            Exit Function
        End If
    Next element
    IsInArray = False
End Function


Sub Export()
    On Error GoTo ErrorHandler
    
    Dim newWorkbook As Workbook
    Dim ws As Worksheet
    Dim exportFilePath As String
    Dim schemeName As String
    Dim firstSchemeCell As Range
    
    ' Get the first word from the SCHEME column in Sheet1
    Set firstSchemeCell = ThisWorkbook.Sheets("Loss Ratio").Range("C6")
    schemeName = firstSchemeCell.Value & " Report"
    
    ' Define the file path using the first word in the SCHEME column
    exportFilePath = Application.GetSaveAsFilename(schemeName & ".xlsx", "Excel Files (*.xlsx), *.xlsx")
    
    ' Check if the user canceled the Save As dialog
    If exportFilePath = "False" Then Exit Sub
    
    ' Create a new workbook
    Set newWorkbook = Workbooks.Add
    
    ' Loop through each worksheet in the current workbook
    For Each ws In ThisWorkbook.Worksheets
        ' Skip the imported data sheet (Sheet1) and the Home sheet
        If ws.Name <> "Sheet1" And ws.Name <> "Home" Then
            ' Copy the sheet to the new workbook
            ws.Copy After:=newWorkbook.Sheets(newWorkbook.Sheets.Count)
        End If
    Next ws
    
    ' Delete the default blank sheet created in the new workbook
    Application.DisplayAlerts = False
    newWorkbook.Sheets(1).Delete
    Application.DisplayAlerts = True
    
    ' Save the new workbook to the specified path
    newWorkbook.SaveAs Filename:=exportFilePath, FileFormat:=xlOpenXMLWorkbook ' .xlsx format
    newWorkbook.Close SaveChanges:=False
    
    MsgBox "Action Complete!"
    
    Exit Sub

ErrorHandler:
    MsgBox "An error occurred during export: " & Err.Description
End Sub

Sub LossRatio()
    On Error GoTo ErrorHandler

    Dim ws As Worksheet
    Dim wsMemberUsage As Worksheet
    Dim lastRow As Long
    Dim distinctMemberCount As Long
    Dim totalClaimsIncurred As Double
    Dim schemeName As String
    Dim dataSheet As Worksheet
    Dim memberColumn As Range
    Dim amountColumn As Range
    Dim newSheet As Worksheet
    Dim pictureToCopy As Shape
    Dim targetWorkbook As Workbook
    Dim targetSheet As Worksheet
    Dim cellToFind As Range
    Dim cellToReturnC As Range
    Dim cellToReturnD As Range
    Dim cellToReturnE As Range
    Dim searchName As String
    Dim desktopPath As String
    Dim targetFilePath As String

    ' Get the name of the scheme from Sheet1 (as in the Export sub)
    Set dataSheet = ThisWorkbook.Sheets("Sheet1")
    schemeName = dataSheet.Range("D2").Value

    Dim usageSheet As Worksheet

    ' Set the usage sheet (replace "MemberUsage" with your actual sheet name)
    Set usageSheet = ThisWorkbook.Sheets("Member Usage")
    
    ' Calculate count of MEMBER NUMBER in the usage sheet's column B and subtract 2
    distinctMemberCount = WorksheetFunction.CountA(usageSheet.Range("B2:B" & usageSheet.Cells(usageSheet.Rows.Count, "B").End(xlUp).Row)) - 2

    ' Calculate the sum of the AMOUNT column
    Set amountColumn = dataSheet.Range("P2:P" & dataSheet.Cells(dataSheet.Rows.Count, "P").End(xlUp).Row)
    totalClaimsIncurred = WorksheetFunction.Sum(amountColumn)

    ' Find the Member Usage sheet
    Set wsMemberUsage = Worksheets("Member Usage")
    
    ' Delete the sheet if it already exists
    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("Loss Ratio").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    ' Create the Loss Ratio sheet before Member Usage sheet
    Set newSheet = Worksheets.Add(Before:=wsMemberUsage)
    newSheet.Name = "Loss Ratio"
    
    ' Set the tab color to dark purple
    With newSheet.Tab
        .ThemeColor = xlThemeColorDark1
        .TintAndShade = -0.149998474074526
    End With
    
    ' Populate the content in the respective cells
    With newSheet
        .Range("B8").Value = "COMPANY NAME"
        .Range("B9").Value = "START DATE"
        .Range("B10").Value = "END DATE"
        .Range("B11").Value = "VALUATION DATE"
        .Range("B13").Value = "POPULATION"
        .Range("B14").Value = "NUMBER OF CLAIMANTS"
        .Range("B15").Value = "INCIDENCE RATE"
        .Range("B17").Value = "LOSS RATIO COMPUTATION"
        .Range("B18").Value = "BASIC PREMIUM"
        .Range("B19").Value = "CLAIMS INCURRED"
        .Range("B20").Value = "EXPECTED CLAIMS"
        .Range("B21").Value = "TOTAL EXPENDITURE"
        .Range("B22").Value = "CURRENT LOSS RATIO"
        .Range("B23").Value = "PROJECTED LOSS RATIO"

        ' Populate values in column B
        .Range("C8").Value = schemeName
        .Range("C19").Value = totalClaimsIncurred
        .Range("C14").Value = distinctMemberCount
        .Range("C11").Formula = "=MAX(Sheet1!L:L)"
        .Range("C15").Formula = "=IFERROR(C14/C13,0)"
        .Range("C22").Formula = "=IFERROR(C19/C18,0)"
        .Range("C23").Formula = "=IFERROR(C21/C18,0)"
        .Range("C21").Formula = "=IFERROR(C19+C20,0)"
        .Range("C20").Formula = "=IFERROR(C19/DATEDIF(C9,C11,""d"")*(DATEDIF(C11,C10,""d"")),0)"
        .Range("C9").NumberFormat = "dd-mmm-yyyy"
        .Range("C10").NumberFormat = "dd-mmm-yyyy"
        .Range("C11").NumberFormat = "dd-mmm-yyyy"
        .Range("C17").NumberFormat = "#,##0"
    End With

    ' Apply borders to range A8:B23
    With newSheet.Range("B8:C23").Borders
        .LineStyle = xlContinuous
        .ColorIndex = 0
        .TintAndShade = 0
        .Weight = xlThin
    End With

    ' Format the sheet: Book Antiqua font, size 10
    With newSheet.Cells
        .Font.Name = "Garamond"
        .Font.Size = 10
    End With

    ' Remove gridlines
    newSheet.Activate
    ActiveWindow.DisplayGridlines = False

    ' Apply fill color (Sky Blue) to specified ranges
    With newSheet
        .Range("B8:C8").Interior.Color = RGB(135, 206, 235)    ' Sky Blue for COMPANY NAME row
        .Range("B13:C13").Interior.Color = RGB(135, 206, 235)  ' Sky Blue for POPULATION row
        .Range("B17:C17").Interior.Color = RGB(135, 206, 235)  ' Sky Blue for LOSS RATIO COMPUTATION row
        .Range("B23:C23").Interior.Color = RGB(135, 206, 235)  ' Sky Blue for PROJECTED LOSS RATIO row
    End With

    newSheet.Range("C11").Value = newSheet.Range("C11").Value

    ' Auto-fit the columns to their contents
    newSheet.Columns("B:C").AutoFit
    
    ' Delete the first 3 rows
    newSheet.Rows("1:2").Delete

    ' Copy the image from Home sheet (Picture 10) and paste it in cell B1 on Loss Ratio sheet
    Set pictureToCopy = ThisWorkbook.Sheets("Home").Shapes("Picture 10")
    pictureToCopy.Copy
    newSheet.Paste Destination:=newSheet.Range("B1")

    ' Set active cell
    newSheet.Activate
    newSheet.Range("C16:C19").NumberFormat = "#,##0"
    newSheet.Range("C11:C12").NumberFormat = "#,##0"
    newSheet.Range("C13").NumberFormat = "0%"
    newSheet.Range("C20").NumberFormat = "0%"
    newSheet.Range("C21").NumberFormat = "0%"
    newSheet.Range("B6").Select

   
  ' Display a message box to prompt the user
MsgBox "Click to select the Premium file.", vbInformation, "File Selection"
   
   
   Dim selectedFilePath As Variant

' Open a file dialog to select any Excel file
selectedFilePath = Application.GetOpenFilename( _
    FileFilter:="Excel Files (*.xlsx), *.xlsx", _
    Title:="Select Premium File")

' Check if the user canceled the dialog
If selectedFilePath = False Then
    MsgBox "No file selected. Exiting the sub."
    Exit Sub
End If

' Open the selected workbook
Set targetWorkbook = Workbooks.Open(selectedFilePath)


        ' Check if the Premium sheet exists, delete if it does
    On Error Resume Next
    Application.DisplayAlerts = False
    targetWorkbook.Sheets("Premium").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0

    ' Create the Premium sheet
    Set targetSheet = targetWorkbook.Sheets.Add(After:=targetWorkbook.Sheets(targetWorkbook.Sheets.Count))
    targetSheet.Name = "Premium"
    
    
        ' Copy everything from the ALL COMPANY PERFORMANCE sheet
    Dim sourceSheet As Worksheet
    Set sourceSheet = targetWorkbook.Sheets("ALL COMPANY PERFOMANCE")
    
    ' Copy all used range from sourceSheet and paste values to Premium sheet
    sourceSheet.UsedRange.Copy
    targetSheet.Range("A1").PasteSpecial Paste:=xlPasteValues

    ' Get the search name from cell C6
    searchName = newSheet.Range("C6").Value

    ' Find the row where the name matches in the target sheet
    Set cellToFind = targetSheet.Columns("B").Find(What:=searchName, LookIn:=xlValues, LookAt:=xlWhole)

    If Not cellToFind Is Nothing Then
        ' If found, return corresponding values
        newSheet.Range("C7").Value = targetSheet.Cells(cellToFind.Row, 3).Value  ' Column C
        newSheet.Range("C8").Value = targetSheet.Cells(cellToFind.Row, 4).Value  ' Column D
        newSheet.Range("C16").Value = targetSheet.Cells(cellToFind.Row, 5).Value  ' Column E
        newSheet.Range("C11").Value = targetSheet.Cells(cellToFind.Row, 6).Value  ' Column F
    Else
        MsgBox "Scheme not found in Premium Register"
    End If

    ' Close the external workbook without saving
    targetWorkbook.Close False

    Exit Sub

ErrorHandler:
    MsgBox "An error occurred: " & Err.Description
End Sub

Sub Close_Report()
    
Dim ws As Worksheet
    
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> "Home" Then
            Application.DisplayAlerts = False
            ws.Delete
            Application.DisplayAlerts = True
        End If
    Next ws
    
    ThisWorkbook.Save
 
    
End Sub
