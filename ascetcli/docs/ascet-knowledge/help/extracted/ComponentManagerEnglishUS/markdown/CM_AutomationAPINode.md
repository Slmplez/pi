# API Node

The API node contains options for the ASCET Automation API. See also [<ASCET installation directory>](ASCETAutomationAPI.chm::/index.html)\Help\ASCETAutomationAPI.chm.

For the meaning of the options in the node, refer to the descriptions in the Options window.

function parser(fn) { var X, Y, sl, a, ra, link; ra = /:/; a = location.href.search(ra); if (a == 2) X = 14; else X = 7; sl = "\\"; Y = location.href.lastIndexOf(sl) + 1; link = 'file:///' + location.href.substring(X, Y) + fn; location.href = link; }
