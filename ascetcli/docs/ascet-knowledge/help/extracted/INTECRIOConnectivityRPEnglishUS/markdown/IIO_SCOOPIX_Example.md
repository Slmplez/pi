# SCOOP-IX Example

An extract of a simple SCOOP-IX file created with ASCET can be found below. The example is used exclusively to show usage of the SCOOP-IX format and possible file contents, it does not claim to be meaningful or correct.

...

<module

xmlns="http://www.etas.com/scoop-ix/1.2"

xmlns:ix="http://www.etas.com/scoop-ix/1.2"

xmlns:asd="http://www.etas.com/scoop-ix/1.2/modelDomain/ascet"

xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"

xsi:schemaLocation="http://www.etas.de/scoop-ix/1.2 c:\ETAS\ASCET6.4\Formats\SCOOP-IX\1.2\Schemas\scoop-ix-domain-asd.xsd"

xmlns:html="http://www.w3.org/1999/xhtml" >

...

<interface>

<modelLinkBase href="asd://{{modelDir}}?INTECRIO-ASC/ASDSimpleModel/" > </modelLinkBase>

<pathBase path="{{codeDir}}" ></pathBase>

<headerFile name="asdsimplemodel.h" ></headerFile>

<headerFile name="conf.h" ></headerFile>

<headerFile name="globalh.h" ></headerFile>

<headerFile name="modulem.h" ></headerFile>

<usage layoutFamily="asd:standardLayout" ></usage>

&baseTypes-asd;

<definitions>

<conversion name="ident">

<rationalFunction>

<numerator bx="1" ></numerator>

<denominator f="1" ></denominator>

</rationalFunction>

</conversion>

</definitions>

<dataElement interfaceKind="export">

<dataCInterface identifier="MODULE_IMPL_ClassObj.Out1->val">

<type><typeRef name="real64" ></typeRef></type>

<fileOrigin name="MODULEM.c" ></fileOrigin>

<initValue value="0.0" ></initValue>

</dataCInterface>

<modelOrigin identifier="ASDSimpleModel.Module.Out1">

<name>Out1</name>

<modelLink href="Module.Out1" ></modelLink>

<modelLocation>

<pathNode name="Module" kind="asd:module">

<pathParameter name="asd:implementation" value="Impl" ></pathParameter>

<pathParameter name="asd:dataSet" value="Data" ></pathParameter>

</pathNode>

<pathNode name="Out1" kind="asd:element" > </pathNode>

</modelLocation>

<modelKind kind="message" visibility="public">

<flowDirection in="false" out="true" > </flowDirection>

</modelKind>

<modelType type="continuous" >

<valueRange min="-1.e+37" max="1.e+37" ></valueRange>

</modelType>

<annotation>

<ix:documentation xmlns="http://www.w3.org/1999/xhtml" lang="en-US">

This is output message <i>Out1</i> of continuous type.

</ix:documentation>

</annotation>

</modelOrigin>

<implementation>

<conversionRef name="ident" ></conversionRef>

<valueRange min="-2147483648" max="2147483647" ></valueRange>

<saturation value="true" resolution="reduce" assignment="true" ></saturation>

<zeroExcluded value="false" ></zeroExcluded>

</implementation>

<usage measurement="true" virtual="false" variant="false" >

<address kind="pseudo" >

<BLOB kind="KP_BLOB" device="E_TARGET" > <![CDATA[2 1001 1 1001 1]]></BLOB>

</address>

</usage>

</dataElement>

<dataElement interfaceKind="export">

<dataCInterface identifier="ASDSIMPLEMODEL_IMPL_ClassObj.Module->myPar->val">

<type><typeRef name="real64" ></typeRef></type>

<fileOrigin name="MODULEM.c" > </fileOrigin>

<initValue value="3.2" />

</dataCInterface>

<modelOrigin identifier="ASDSimpleModel.Module.myPar">

<name>myPar</name>

<modelLink href="ASDSimpleModel.Module.myPar" > </modelLink>

<modelLocation>

<pathNode name="Module" kind="asd:module">

<pathParameter name="asd:implementation" value="Impl" > </pathParameter>

<pathParameter name="asd:dataSet" value="Data" > </pathParameter>

</pathNode>

<pathNode name="myPar" kind="asd:element" ></pathNode>

</modelLocation>

<modelKind kind="parameter" visibility="private" ></modelKind>

<modelType type="continuous" >

<valueRange min="-1.e+37" max="1.e+37" ></valueRange>

</modelType>

</modelOrigin>

<implementation>

<conversionRef name="ident" ></conversionRef>

<valueRange min="-1.e+037" max="1.e+037" > </valueRange>

<zeroExcluded value="false" ></zeroExcluded>

</implementation>

<usage calibration="true" virtual="false" variant="false" >

<address kind="pseudo" >

<BLOB kind="KP_BLOB" device="E_TARGET" ><![CDATA[2 1001 1 1000 1]]></BLOB>

</address>

</usage>

</dataElement>

<functionElement interfaceKind="export">

<functionCInterface identifier="MODULE_IMPL_compute">

<signature>

<return>

<type><void /></type>

</return>

<void />

</signature>

<fileOrigin name="MODULEM.c" ></fileOrigin>

</functionCInterface>

<modelOrigin identifier="Module.compute">

<name>compute</name>

<modelLink href="Module.compute" />

<modelLocation>

<pathNode name="Module" kind="asd:module">

<pathParameter name="asd:implementation" value="Impl" ></pathParameter>

<pathParameter name="asd:dataSet" value="Data" ></pathParameter>

</pathNode>

<pathNode name="compute" kind="asd:process" > </pathNode>

</modelLocation>

<modelKind kind="process" visibility="public" > </modelKind>

<runTimeInfo>

<FPUUsage value="true" ></FPUUsage>

<TerminateTaskUsage value="false" > </TerminateTaskUsage>

<messageAccess>

<message identifier="MODULE_IMPL_ClassObj.Out1->val" send="true" ></message>

</messageAccess>

<resourceAccess ></resourceAccess>

<constraint>

<period value="0.01" ></period>

<execution trigger="timer" priority="0" > </execution>

<scheduling mode="preemptive" > <scheduling>

</constraint>

</runTimeInfo>

</modelOrigin>

</functionElement>

</interface>

</module>
