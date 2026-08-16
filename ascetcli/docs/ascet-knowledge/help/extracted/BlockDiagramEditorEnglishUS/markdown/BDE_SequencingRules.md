- Only whole multiples of the value in the Sequence Step Size field (either in the [Sequence Editor](Editingindividual.md) or in the [Sequencing](ComponentManagerEnglishUS.chm::/CM_SequencingNode.htm) node of the ASCET options window) are taken into consideration. If, for example, the value 5 is set, only the numbers 5, 10, 15, 20, ... are checked.
- If the Use Gaps option is activated, any gaps between existing sequence numbers are filled. The first condition still applies; gaps which are not whole multiples of the value in the Sequence Step Size box are not filled.

Example:

If, e.g. the numbers 1–3, 5–9 and 11 have already been assigned and 5 has been specified in the Sequence Step Size box, 10 is assigned, not 4.

The system saves the sequence number last assigned. Gaps below this number are not filled! When you leave the Sequence Editor, or reset one ([Resetting an Individual Sequence Call](Resetindividual.md)) or several sequence calls ([Resetting Several Sequence Calls](ResetSequence.md)), the saved number is reset, automatic numbering starts again at 1.

- If the Use Gaps option is not activated, a search is carried out for the next whole multiple of the value in the Sequence Step Size field after the highest available number.

In the above example (1–3, 5–9 and 11 assigned), 15 is assigned.
