# Project to ESDL and Signal Flow

Use this sequence: Project tree → Formula/assembly/Module instance → exact OID → canonical definition → customer interface/wrapper or Package join point → Component references → BDE/diagram → signal source/transform/consumer → Method call → signature → complete ESDL body → relevant Elements → exact metadata → modification point.

Preserve both Project instance and definition paths. The definition owner determines where ESDL and Element changes are made; the Project context determines mappings, variants, scheduling, and consumer impact.

`bde_edges=0` does not prove that no diagram exists. Do not call code reads on a BDE-only Component. Signal names alone do not establish identity or ownership. With complete evidence, provide concrete ESDL code or an exact patch plus the complete changed Element metadata before preflight.
