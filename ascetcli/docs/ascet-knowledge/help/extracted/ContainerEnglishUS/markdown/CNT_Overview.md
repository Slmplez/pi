# Overview

Container components (available since ASCET 5.0) are used as containers for all kinds of ASCET components, i.e. AUTOSAR components, projects, modules, all kinds of classes, records, enumerations, etc. Their purpose is to structure models and databases/workspaces and place different database/workspace items under a common version control.

The containers in ASCET replace the networks of ASCET versions prior to ASCET 5.0. If you open an old database which contains networks, these networks are automatically converted into containers. The projects assigned to the different nodes of the network are added to the containers. Other information available in the network is not added.

Containers can contain all kinds of database/workspace items apart from folders, even other containers. Direct (the container contains itself) and indirect (the container contains a second container, which in turn contains the first) recursions are admissible. Each database/workspace item can only be contained once in the same container.

See also

[Working with Containers](CNT_working_containers.md)

[Component Manager - Database/Workspace Items](ComponentManagerEnglishUS.chm::/DatabaseItems.htm)
