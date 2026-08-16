# ASCET Automation API

ASCET provides an automation API based on web services.

A MS Visual Studio 2008 solution containing some simple examples to get familiar with the automation API is provided on the ASCET installation disk in the ToolsAndUtilities\WebService\Studio 2008 Example folder.

For a detailed description, see the ASCET Automation API Web Service Reference. (The link opens the API description in a separate window.)

function parser(fn) { var X, Y, sl, a, ra, link; ra = /:/; a = location.href.search(ra); if (a == 2) X = 14; else X = 7; sl = "\\"; Y = location.href.lastIndexOf(sl) + 1; link = 'file:///' + location.href.substring(X, Y) + fn; location.href = link; }
