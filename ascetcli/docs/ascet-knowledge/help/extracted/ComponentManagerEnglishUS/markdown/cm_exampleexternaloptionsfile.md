# Example: External Options File

<?xml version="1.0" encoding="UTF-8"?>

<OptionDeclarations xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="C:\ETAS\ASCET6.2\Schemas\externalOptions.xsd">

<!-- **************** EXTERNAL OPTIONS SAMPLE ******************** -->

<OptionDeclaration xmlCategory="Sample\Options" attributeName="sampleOptionBoolean" optionClass="EtasBooleanOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>Boolean Sample Option</Label>

<Description>This is an example of how to integrate a boolean option into the ASCET Option Dialog</Description>

<Tooltip>Boolean Sample Option</Tooltip>

<InitialValue>true</InitialValue>

<DefaultValue>true</DefaultValue>

</OptionDeclaration>

<OptionDeclaration xmlCategory="Sample\Options" attributeName="SampleOptionString" optionClass="EtasStringOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>String Sample Option</Label>

<Description>This is an example of how to integrate a string option into the ASCET Option Dialog</Description>

<Tooltip>Sting Sample Option</Tooltip>

<InitialValue>Sample string</InitialValue>

<DefaultValue>Sample string</DefaultValue>

</OptionDeclaration>

<OptionDeclaration xmlCategory="Sample\Options" attributeName="SampleOptionNumeric" optionClass="EtasNumericOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>Numeric Sample Option</Label>

<Description>This is an example of how to integrate a numeric option into the ASCET Option Dialog</Description>

<Tooltip>Numeric Sample Option</Tooltip>

<InitialValue>100</InitialValue>

<DefaultValue>100</DefaultValue>

<NumericOption>

<MinValue>0</MinValue>

<MaxValue>255</MaxValue>

</NumericOption>

</OptionDeclaration>

<OptionDeclaration xmlCategory="Sample\Options" attributeName="SampleOptionEnumeration" optionClass="EtasEnumerationOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>Enumeration Sample Option</Label>

<Description>This is an example of how to integrate a enumeration option into the ASCET Option Dialog</Description>

<Tooltip>Enumeration Sample Option</Tooltip>

<InitialValue>Value1</InitialValue>

<DefaultValue>Value1</DefaultValue>

<EnumerationOption>

<StringValues>

<StringValue>Value1</StringValue>

<StringValue>Value2</StringValue>

</StringValues>

<Values>

<Value>1</Value>

<Value>2</Value>

</Values>

</EnumerationOption>

</OptionDeclaration>

<OptionDeclaration xmlCategory="Sample\Options" attributeName="SampleOptionFile" optionClass="EtasFileOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>File Sample Option</Label>

<Description>This is an example of how to integrate a file option into the ASCET Option Dialog</Description>

<Tooltip>File Sample Option</Tooltip>

<InitialValue>C:\samplefile.txt</InitialValue>

<DefaultValue>C:\samplefile.txt</DefaultValue>

<FileOption>

<DialogTitle>Select a Sample File</DialogTitle>

<SearchPath>C:\</SearchPath>

<SearchMask>*.txt</SearchMask>

<InvalidCharacters/>

<FilterTypes>

<FilterType extension="*.txt">

<Description>Text Files</Description>

</FilterType>

<FilterType extension="*.*">

<Description>All Files</Description>

</FilterType>

</FilterTypes>

</FileOption>

</OptionDeclaration>

<OptionDeclaration xmlCategory="Sample\Options" attributeName="SampleOptionPath" optionClass="EtasPathOption" optionCategory="FILE">

<Group>External Options\Examples</Group>

<Label>Path Sample Option</Label>

<Description>This is an example of how to integrate a path option into the ASCET Option Dialog</Description>

<Tooltip>Path Sample Option</Tooltip>

<InitialValue>C:\samplepath\</InitialValue>

<DefaultValue>C:\samplepath\</DefaultValue>

</OptionDeclaration>

<!-- **************** INTEGRATED EXTERNAL OPTIONS SAMPLE ******************** -->

<OptionDeclaration xmlCategory="IntegratedSample\Options" attributeName="IntegratedSampleOptionBoolean" optionClass="EtasBooleanOption" optionCategory="FILE">

<Group>Build\Code Generation</Group>

<Label>Integrated Boolean Sample Option</Label>

<Description>This is an example of how to integrate a boolean option into an existing group of the ASCET Option Dialog.\You can even integrate the option into the Project Options Dialog!</Description>

<Tooltip>Integrated Boolean Sample Option</Tooltip>

<InitialValue>true</InitialValue>

<DefaultValue>true</DefaultValue>

</OptionDeclaration>

</OptionDeclarations>
