# Example: Mapping Export Files

![](Mapping_FilterExample1.gif)

The image above shows the mappings in the Internal Access tab of the Message Mapping view. They are exported

1. [in XML format](#XML_Mapping),
1. [in CSV (comma-separated values) format](#CSV_Mapping).

For each exported mapping, the following information is stored (color-coding is repeated in the export files below):

mapping location, ASCET element name, AUTOSAR element name

In addition, the XML export file contains further details on ASCET element and AUTOSAR element.

##### Mapping Export: XML

<?xml version="1.0" encoding="UTF-8"?>

<AtomicSoftwareComponent>

<VariableMappingsInternal toolVersion="V6.4.0-0054" schemaVersion="6.4.0.2">

<ElementMapping elementName="cont">

<SourceObject displayName="cont" elementName="AUTOSAR\accessMsg\Module_Block_Diagram.cont"/>

<TargetObject displayName="IRV_Record.cont" elementName="Misc\records\Record.cont" modelName="IRV_Record.cont"/>

</ElementMapping>

<ElementMapping elementName="InterR_e">

<SourceObject displayName="InterR_e" elementName="AUTOSAR\accessMsg\Module_Block_Diagram.InterR_e"/>

<TargetObject displayName="InterR_e" elementName="AUTOSAR\accessMsg\SWC_V621.InterR_e" modelName="InterR_e"/>

</ElementMapping>

<ElementMapping elementName="Module_Block_Diagram.SRmsg_s">

<SourceObject displayName="Module_Block_Diagram.SRmsg_s" elementName="AUTOSAR\accessMsg\Module_Block_Diagram.SRmsg_s" modelName="Module_Block_Diagram.SRmsg_s"/>

<TargetObject displayName="InterR_s" elementName="AUTOSAR\accessMsg\SWC_V621.InterR_s" modelName="InterR_s"/>

</ElementMapping>

</VariableMappingsInternal>

<VariableMappingsExternal toolVersion="V6.4.0-0054" schemaVersion="6.4.0.2"/>

<ParameterMappings toolVersion="V6.4.0-0054" schemaVersion="6.4.0.2"/>

</AtomicSoftwareComponent>

##### Mapping Export: CSV

# ASCET CSV Mapping Export File 1.00

messageInternal,cont,IRV_Record.cont

messageInternal,InterR_e,InterR_e

messageInternal,Module_Block_Diagram.SRmsg_s,InterR_s
