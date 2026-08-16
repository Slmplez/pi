# Fundamentals of Software Configuration Management

A major challenge in producing software for automotive use is to keep control of its contents and changes over a long period of time. Also, information exchange between different parties needs to be ensured as in most projects a large number of people are involved in the development process. Due to the constraints imposed by time pressure, reusing as many parts of existing solutions as possible is critical to success. Last but not least, quality standards like ISO or CMMI stipulate that software development for automotive use complies to robust control mechanisms such as version management.

Software version management serves for:

- Storing all software sources in a central storage place ("repository").
- Keeping tracking of software development history by storing versions for each development step or any (major) change.
- Coordinating changes to software parts performed by multiple developers, enabling each developer to "lock" or "reserve" the part he/she is currently working on. This "lock" or "reserve" mechanism ensures that no two users change the same part at the same time.

Software [configuration](SCM_Configurations.md) management extends software version management by the following capabilities:

- Storing reproducible copies of complete deliverables, i.e. combinations of versions of software parts that belong to the same ECU project.
- Recovering previous delivery states (e.g. for maintenance or reuse in other projects).
- Discovering interdependencies between multiple deliverables (e.g. reused classes that occur in multiple ECU projects; changes in one project might affect other deliveries, too).

To provide these capabilities and to support the user in performing the associated tasks, an SCM tool has to offer interface for:

Managing access by multiple users from different places to the same server/repository.

- Retrieving defined versions of software parts, providing information for identifying development history.
- Reserving parts of the software for one user to make changes. ASCET-SCM uses the term "edition" for an item that is reserved by one user; the user can edit the contents of this item only in the "edition" state. Upon completion of these edits, the users will save a new status (version) of the edited software parts.
- Retrieving and saving combinations of software parts (i.e. saving their dependencies complete with detailed version status information) and enabling users to view details about these "configurations".

See also

[Software Version Management Systems](SCM_Software_Version_Management_Systems.md)
