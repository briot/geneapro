from style import Citation_Style
evidence_style = {

   'ESM93': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Artifact, Creator as lead element in Source List',
       biblio='{Creator (Last)}, {Creator (First)}. "{Artifact Title}." {Item Type}. {Creation Date}. {Collection}. {Repository}, {Repository Location (Short)}.',
       full='{Creator (First)} {Creator (Last)}, "{Artifact Title}," {Item Type}, {Creation Date}; {Item No.}, {Collection}; {Repository}, {Repository Location}. {Descriptive Detail}.',
       short='{Creator (Last)}, "{Artifact Title}," {Collection}.'),

   'ESM94': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Digital Archives, Collection (database) as lead element in Source List',
       biblio='"{Collection}." {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Collection}," {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Type Or Format (Short)}, "{Document Title}," {Page(S)}; {Credit Line (Source Of This Source)}.',
       short='"{Collection}," <I>{Website Title}</I>, "{Document Title (Short)}," {Page(S) (Short)}.'),

   'ESM95': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Manuscript Records, Collection as lead element in Source List',
       biblio='{Collection}. {Repository}, {Repository Location}.',
       full='"{Record Title}," {Record Date(S)}; {Item Or Piece}, {Item Or Piece Number}; {Collection}; {Repository}, {Repository Location}. {Evaluation/Descriptive Details}.',
       short='"{Record Title (Short)}," {Date (Short)}, {Collection (Short)}, {Item Or Piece Number}.'),

   'ESM96': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Manuscript Records, Document as lead element in Source List',
       biblio='"{Document Title}." {Series No.}, {Series Name}, {Collection}. {Repository}, {Repository Location}.',
       full='"{Document Title}," {Series No.}, {Series Name}, {Volume}, {Page(S)}; {Collection}, {Repository}, {Repository Location}.',
       short='"{Document Title (Short)}," {Series No.}, {Volume (Short)}:{Page(S) (Short)}; {Collection}.'),

   'ESM97': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Manuscript Records, Series as lead element in Source List',
       biblio='{Series}. {Collection}. {Repository}, {Repository Location}.',
       full='{Author (Grantor)} To {Recipient}, {Record Id (Generic)}, {Record Date(S)}; {File No.}, {File Name}; {Series (Long)}; {Collection}, {Repository}, {Repository Location}.',
       short='{Author (Short)} To {Recipient (Short)}, {Record Id (Short)}, {Date (Short)}, {Series (Short)}, {Collection}.'),

   'ESM98': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Personal Bible, Original Owner as lead element in Source List',
       biblio='{Bible Id Original Owner (Last)}, {Bible Id Original Owner (First)}, {Date Range}. <I>{Bible Title}</I>. {Publication Place}: {Publisher}, {Year Published}. {Collection}. {Repository}, {Repository Location}.',
       full='{Bible Id Original Owner (First)} {Bible Id Original Owner (Last)}, {Date Range}; <I>{Bible Title}</I> ({Publication Place}: {Publisher}, {Year Published}); {Manuscript No.}, {Collection}; {Repository}, {Repository Location}. {Descriptive Detail}.',
       short='{Bible Id (Short)}, {Specific Data}.'),

   'ESM99': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Portrait, Subject as lead element in Source List',
       biblio='{Subject Last}, {Subject First}. {Creation Date}. {Collection}. {Repository1}, {Repository Location}.',
       full='{Subject First} {Subject Last}, {Creation Date}; {Collection}, {Repository2}, {Repository Location}. {Archival Description}.',
       short='{Subject First} {Subject Last}, {Creation Date}, {Collection}.'),

   'ESM100': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Research Report, Author as lead element in Source List',
       biblio='{Author & Professional Credentials Last}, {Author & Professional Credentials First}. "{Report Title Or Subject}." {Item Type} To {Recipient}. {Report Date}. {Collection}, {Repository}, {Repository Location}.',
       full='{Author & Professional Credentials First} {Author & Professional Credentials Last}, "{Report Title Or Subject}," {Page(S)}; {Item Type} To {Recipient}, {Report Date}; {Collection}, {Repository}, {Repository Location}.',
       short='{Author (Short)}, "{Report Title Or Subject}," {Page(S)}.'),

   'ESM101': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Unpublished Narrative, Author as lead element in Source List',
       biblio='{Author Last}, {Author First}. "{Manuscript Title}." {Manuscript No.}. {Repository}, {Repository Location}.',
       full='{Author First} {Author Last}, "{Manuscript Title}," {Page(S)}; {Manuscript No.}, {Repository}, {Repository Location}.',
       short='{Author (Short)}, "{Manuscript Title (Short)}," {Page(S) (Short)}.'),

   'ESM102': Citation_Style(
       category='Archives & Artifacts',
       type='Archived Material: Vertical File, Author as lead element in Source List',
       biblio='{Author}. "{Item Title}." {Item Date}. Folder: "{Folder Label}." {Collection}. {Repository}, {Repository Location}.',
       full='{Author}, "{Item Title}" ({Item Date}); Folder: "{Folder Label}," {Collection}; {Repository}, {Repository Location}.',
       short='{Author}, "{Item Title}."'),

   'ESM103': Citation_Style(
       category='Archives & Artifacts',
       type='Preservation Film: FHL<endash>GSU Film, Compiler as lead element in Source List',
       biblio='{Compilers Last}, {Compilers First}. "{Manuscript Series Title}." {No. Of Vols.} {Item Type Or Format}. {Creation Date}. {Owner Repository}, {Owner Location}. {Film Id (Short)}, {No. Of Rolls}. {Film Repository}, {Film Location}.',
       full='{Compilers First} {Compilers Last}, "{Manuscript Series Title}," {No. Of Vols.} ({Item Type Or Format}, {Creation Date}, {Owner Repository}, {Owner Location}), {Volume Used}, {Section}: {Item Of Interest}; {Film Id}.',
       short='{Compilers (Short)}, "{Manuscript Series Title (Short)}," {Volume Used}, {Section (Short)}: {Item (Short)}.'),

   'ESM104': Citation_Style(
       category='Archives & Artifacts',
       type='Preservation Film: In-House Film, Collection as lead element in Source List',
       biblio='{Collection}. {Film Id}. {Repository}, {Repository Location}.',
       full='"{Record Title}," {Record Date(S)}; {File}, {Collection}; {Film Id & Roll No.}; {Repository}, {Repository Location}.',
       short='"{Record Title}," {Year(S)}, {File}, {Collection}.'),

   'ESM105': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Artifact, Compiler as lead element in Source List',
       biblio='{Compiler Last}, {Compiler First}. {Artifact Id (Short)}. {Creation Date}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Item Id (Generic)}, {Artifact Id}, {Creation Date}; {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}, {Year Owned}. {Descriptive Detail}.',
       short='{Item Id (Short)}, {Artifact Id2}.'),

   'ESM106': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Diary or Journal, Author as lead element in Source List',
       biblio='{Author Last}, {Author First}. "{Manuscript Title}." {Record Type}. {Place Created}, {Record Date(S)}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Author First} {Author Last}, "{Manuscript Title}," {Page(S)}; {Record Type}, {Record Date(S)} ({Place Created}; {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}, {Year Owned}). {Descriptive Detail}.',
       short='{Author (Short)}, "{Manuscript Title}," {Page(S) (Short)}.'),

   'ESM107': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Family Bible Records, Original owner as lead element in Source List',
       biblio='{Bible Id (Owner Last)}, {Bible Id (Owner First)}, {Inclusive Dates}. <I>{Bible Title}</I>. {Place Of Publication}: {Publisher}, {Year Published}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Bible Id (Owner First)} {Bible Id (Owner Last)}, {Inclusive Dates}, <I>{Bible Title}</I> ({Place Of Publication}: {Publisher}, {Year Published}), "{Page Or Section}"; {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}, {Year Owned}. {Descriptive Detail}.',
       short='{Bible Id (Owner First)} {Bible Id (Owner Last)}, "{Page Or Section}."'),

   'ESM108': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Family Chart or Group Sheet, Compiler as lead element in Source List',
       biblio='{Compiler Last}, {Compiler First}. {Collection}. {Owner Or Supplier}, {{Address For Private Use}, }{Owner Or Supplier\'S Location}. {Year Supplied}.',
       full='{Compiler First} {Compiler Last}, {Item (Generic Id)}, {Collection}; {Supplier}, {{Address For Private Use}, }{Owner Or Supplier\'S Location}, {Year Supplied}. {Description & Evaluation By Researcher}.',
       short='{Compiler (Short)}, {Item (Generic Id)}, {Referral To Prior Evaluation}.'),

   'ESM109': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Historic Letter, Writer as lead element in Source List',
       biblio='{Writer Last}, {Writer First} ({Writer\'S Location}) To {Recipient}. {Item Type}. {Record Date(S)}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Writer First} {Writer Last} ({Writer\'S Location}) To {Recipient}, {Item Type}, {Record Date(S)}; {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}, {Year Owned}. {Descriptive Detail Or Other Relevant Discussion}.',
       short='{Writer First} {Writer Last} To {Recipient (Short)}, {Record Date(S)}.'),

   'ESM110': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Interview Tape & Transcript, Informant as lead element in Source List',
       biblio='{Person Interviewed Last}, {Person Interviewed First}. {Location}. {Item Type} By {Name Of Interviewer}, {Record Date(S)}. {Item Format}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Person Interviewed First} {Person Interviewed Last} ({{Interviewee Address For Private Use}, }{Location}), {Item Type} By {Interviewer}, {Record Date(S)}; {Item Format} {Current Or Last Known Owner}, {{Owner\'S Address For Private Use}, }{Owner\'S Location}, {Year Owned}.',
       short='{Person Interviewed (Short)}, {Item Type}, {Record Date(S)}.'),

   'ESM111': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Legal Document Unrecorded Family Copy, Collection as lead element in Source List',
       biblio='{Collection}. {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}. {Year Owned}.',
       full='{Grantor (Author)}, To {Recipient}, {Record Id (Generic)}, {Record Date(S)}; {Item Format}, {Collection}; {Current Or Last Known Owner}, {{Address For Private Use}, }{Owner\'S Location}, {Year Owned}. {Evaluation/Descriptive Details}.',
       short='{Grantor (Short)} To {Recipient (Short)}, {Generic Id (Short)}, {Record Date(S) (Short)}.'),

   'ESM112': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Personal Correspondence, Collection as lead element in Source List',
       biblio='{Collection}. {Researcher\'S Id}, {{Contact Private Address}, }{Contact Address}.',
       full='{Writer}, {Writer\'S Affiliation (If Relevant)}, {Writer\'S Location}, To {Recipient}, {Item Type}, {Record Date(S)}, {Subject Or Nature Of Data Provided}; {Folder}; {Series Or Research Project}, {Collection}; {Researcher}, {{Private Researcher Address}, }{Researcher Location}.',
       short='{Writer (Short)} To {Recipient (Short)}, {Record Date(S)}.'),

   'ESM113': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Personal e-mail: Collection as lead element in Source List',
       biblio='{Collection}. {Researcher\'S Id}, {{Contact Private Address}, }{Contact Address}.',
       full='{Writer}, {Writer\'S Location} {{Writer\'S Contact Information}, }To {Recipient}, {Item Type}, {Record Date(S)}, "{Subject Line}," {File}, {Research Series}, {Collection}; {Researcher\'S Id (Short)}, {{Researcher\'S Private Contact Information}, }{Researcher\'S Address}.',
       short='{Writer (Short)} To {Recipient (Short)}, {Item Type}, {Record Date(S)}.'),

   'ESM114': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Research Report, Author as lead element in Source List',
       biblio='{Author & Professional Credentials Last, First}. "{Report Title (Quoted Exactly)}." {Item Type} To {Recipient} {{Recipient\'S Private Address}, }{Recipient\'S Address}, {Report Date}. {Item Format} {Owner & Contact Information}.',
       full='{Author & Professional Credentials First Last}, "{Report Title (Quoted Exactly)}," {Page(S)}; {Item Type} To {Recipient}, {{Recipient\'S Private Location}, }{Recipient\'S Location}, {Report Date}; {Item Format} {Owner & Contact Information}.',
       short='{Author (Short)}, "{Report Title (Quoted Exactly)}," {Page(S)}.'),

   'ESM115': Citation_Style(
       category='Archives & Artifacts',
       type='Private Holdings: Tradition, Recorded, Collection as lead element in Source List',
       biblio='{Collection}. {Compiler}. {Record Type}, {Creation Date}. {Current Or Last Known Owner}, {{Owner\'S Private Address}, }{Owner\'S Address}.',
       full='{Collection}, {Compiler} ({Record Type}, {Creation Date}; {Current Or Last Known Owner}, {{Owner\'S Private Address}, }{Owner\'S Address}); {Subject}, {Source Of Information}, {Source\'S Relationship To Subject, Etc.}, {Item Date}. {Provenance & Evaluation Of Tradition}.',
       short='{Generic Label (Short)}, {Reference To Prior Discussion}.'),

   'ESM161': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records: Bound Volume, Corporate collection as lead element in Source List',
       biblio='{Name Of Collection}. {Series}. {Repository}, {Repository Location}.',
       full='"{Record Book Title (Quoted Exactly)}," {Page(S)}; {Series}; {File Location}, {Corporate Collection}; {Repository}, {Repository Location}.',
       short='"{Record Book Title (Quoted Exactly)}," {Page(S) (Short)}, {Collection (Short)}.'),

   'ESM162': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records Document (Loose Record), Corporate collection as lead element in Source List',
       biblio='{Corporate Collection}. {Series}. {Record Group And/Or Subgroup}. {Repository}, {Repository Location}.',
       full='{Item}, {Item Type}, {Record Date(S)}; {File Location}; {Series}; {Record Group And/Or Subgroup}, {Corporate Collection}; {Repository}, {Repository Location}.',
       short='{Item (Short)}, {Record Date(S)}, {Series (Short)}, {Corporate Collection}.'),

   'ESM163': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records: Extract Supplied by Staff, Corporate writer as lead element in Source List',
       biblio='{Corporate Writer} ({Writer\'S Location}) To {Recipient}. {Item Type}. {Record Date(S)}. {Record Owner}, {{Owner\'S Private Location}, }{Owner\'S Location}. {Date Owned}.',
       full='{Corporate Writer} ({Writer\'S Location}) To {Recipient}, {Item Type}, {Record Date(S)}, {Subject Or Nature Of Data Provided}; {Record Owner}, {{Owner\'S Private Location}, }{Owner\'S Location}, {Year Owned}.',
       short='{Corporate Writer} To {Recipient (Short)}, {Record Date(S)}.'),

   'ESM164': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records: Microfilm, Corporate collection as lead element in Source List',
       biblio='{Corporate Collection}. {Series}. {Subseries}. {Microfilm Id/Roll No(S).}. {Repository}, {Repository Location}.',
       full='"{Record Title}," {Specific Item Of Interest}; {Subseries}; {Series}; {File Location}, {Corporate Collection} ({Microfilm Id/Roll No(S). (Short)}), {Repository}, {Repository Location}.',
       short='"{Record Title}." {Specific Item Of Interest (Short)}; {Subseries (Short)}, {Series (Short)}; {Corporate Collection}.'),

   'ESM165': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records: Online Database, Database as lead element in Source List',
       biblio='"{Database Title}." {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}." {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Digital Path (When Necessary)}, {Item Of Interest}.',
       short='"{Database Title}," <I>{Website Title}</I>, {Item Of Interest}.'),

   'ESM166': Citation_Style(
       category='Business & Institutional Records',
       type='Corporate Records: Online Images, Collection as lead element in Source List',
       biblio='"{Collection}." {Item Type Or Format}. <I>{Website Title}</I> {Url (Digital Location)} : {Year(S)}. {Credit Line (Source Of This Source)}.',
       full='"{Collection}," {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; Citing "{Full Credit Line (Source Of The Source)}."',
       short='"{Collection}," <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM167': Citation_Style(
       category='Business & Institutional Records',
       type='Lineage-Society Records Application File, Organization as lead element in Source List',
       biblio='{Organization1}. {Collection}. {Repository}, {Repository Location}.',
       full='{File}, {Membership Number}, {Organization2}, {Repository}, {Repository Location}.',
       short='{File}, {Membership Number}, {Organization (Short)}.'),

   'ESM168': Citation_Style(
       category='Business & Institutional Records',
       type='Lineage-Society Records, Online Database, Organizations as lead element in Source List',
       biblio='{Organization1}. <I>{Website Title}</I>. {Item Type Or Format}. {Url (Digital Location)} : {Year(S)}.',
       full='{Organization2}, <I>{Website Title}</I>, {Item Type Or Format} ({Url (Digital Location)} : {Date}), {Item Of Interest}.',
       short='{Organization (Short Title)}, <I>{Website Title}</I>, {Item Of Interest}.'),

   'ESM169': Citation_Style(
       category='Business & Institutional Records',
       type='Organizational Records: Archived In-House, Organization as lead element in Source List',
       biblio='{Organization}. {Collection}. {Repository}, {Repository Location}.',
       full='"{Record Title (Quoted Exactly)}"; {File}, {Series}, {Collection}; {Repository}, {Organization}, {Repository Location}.',
       short='"{Record Title (Quoted Exactly)}," {Collection}.'),

   'ESM170': Citation_Style(
       category='Business & Institutional Records',
       type='Organizational Records: Archived Off-Site, Organization as lead element in Source List',
       biblio='{Organization (Creator)}. "{File Title}, {Item Type Or Format}." {Repository}, {Repository Location}.',
       full='{Item Of Interest}; "{File Title}, {Item Type Or Format}," {Organization (Creator)}, {Repository}, {Repository Location}.',
       short='{Item Of Interest (Short)}, "{File Title (Short)}," {Organization (Creator)}.'),

   'ESM171': Citation_Style(
       category='Business & Institutional Records',
       type='Professional Reports: Genetic Testing, Corporate author as lead element in Source List',
       biblio='{Corporate Author} ({Corporate Location}). "{Report Title}," {Recipient}, {{Recipient\'S Private Location}, }{Recipient\'S Location}. {Report Date}. {Where & When Held}.',
       full='{Corporate Author} ({Corporate Location}), "{Report Title}," {Recipient}, {{Recipient\'S Private Location}, }{Recipient\'S Location}, {Report Date}; {Where & When Held}.',
       short='{Corporate Author}, "{Report Title}," {Report Date}.'),

   'ESM172': Citation_Style(
       category='Business & Institutional Records',
       type='Professional Reports: Historical Research: Corporate, Author as lead element in Source List',
       biblio='{Researcher (Author) (Last)}, {Researcher (Author) (First)}< {Professional Credentials}>. ({Corporate Affiliation}, {Corporate Location}.) "{Report Title (Quoted Exactly)}." {Item Type} {Recipient}, {{Recipient\'S Private Location}. }{Report Date}. {Where Held}{ {Where Held Private Address}}. {When Held}.',
       full='{Researcher (Author) (First)} {Researcher (Author) (Last)}< {Professional Credentials}> ({Corporate Affiliation}, {Corporate Location}), "{Report Title (Quoted Exactly)}," {Page(S)}; {Item Type} {Recipient}, {{Recipient\'S Private Location}, }{Report Date}; {Where Held}{ {Where Held Private Address}}, {When Held}.',
       short='{Author (Short)}, "{Report Title (Quoted Exactly)}," {Page(S) (Short)}.'),

   'ESM173': Citation_Style(
       category='Business & Institutional Records',
       type='Professional Reports: Historical Research: Online, Corporate author as lead element in Source List',
       biblio='{Corporate Author (Researchers Not Identified)} ({Corporate Location}). "{Report Title (Quoted Exactly)}." {Report Date (Short)}. <I>{Website Title}</I>. {Url (Digital Location)} : {Access Year}.',
       full='{Corporate Author (Researchers Not Identified)} ({Corporate Location}), "{Report Title (Quoted Exactly)}," {Report Date}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Page Or Specific Part}.',
       short='{Author}, "{Report Title (Short)}," {Specific Part}.'),

   'ESM174': Citation_Style(
       category='Business & Institutional Records',
       type='School Records: Administrative Material, Institutional author as lead element in Source List',
       biblio='{Institutional Author}. "{Record/Volume Title}." {Repository}, {Repository Location}.',
       full='{Institutional Author}, "{Record/Volume Title}," {Page(S)}, {Item Of Interest}; {Repository}, {Repository Location}.',
       short='{Institutional Author}, "{Record/Volume Title}," {Page(S) (Short)}.'),

   'ESM175': Citation_Style(
       category='Business & Institutional Records',
       type='School Records: Student Transcript, Person as lead element in Source List',
       biblio='{Student (Last)}, {Student (First)}. {Class}. {Record Id (Generic)}. {Institution}, {Location Of Institution}. {Record Holder},{ {Record Holder Private Address},} {Where Held}. {When Held}.',
       full='{Student (First)} {Student (Last)}, {Class}, {Record Id (Generic)}; {Institution}, {Location Of Institution}; {Record Date(S)} To {Recipient}; {Record Holder},{ {Record Holder Private Address},} {Where Held}, {When Held}.',
       short='{Student (First)} {Student (Last)}, {Class}, {Record Id (Generic)}, {Institution}.'),

   'ESM209': Citation_Style(
       category='Cemetery Records',
       type='Cemetery Office Records: Personally Used, Cemetery office as lead element in Source List',
       biblio='{Cemetery (Author)} ({Location}). {Item Type Or Format}.',
       full='{Cemetery (Author)} ({Location}) {Record Type}, {Subject Or Nature Of Data Provided}. {Analytical Comments By Researcher}.',
       short='{Cemetery (Author)} ({Location (Short)}), {Record Type}.'),

   'ESM210': Citation_Style(
       category='Cemetery Records',
       type='Cemetery Office Records: Supplied By Staff, Cemetery office as lead element in Source List',
       biblio='{Cemetery (Author)} ({Location}) To {Recipient}. {Item Type}. {Year(S)}.',
       full='{Cemetery (Author)} ({Location}) To {Recipient}, {Item Type}, {Record Date(S)}, {Subject Or Nature Of Data Provided}.',
       short='{Cemetery (Author)} ({Location (Short)}) To {Recipient (Short)}, {Record Date(S)}.'),

   'ESM211': Citation_Style(
       category='Cemetery Records',
       type='Cemetery Office Records: Online Images, Compiler as lead element in Source List',
       biblio='{Creator}. <I>{Website Title}</I>. {Item Type & Format L}. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator}, <I>{Website Title}</I>, {Item Type & Format F} ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='<I>{Website Title}</I>, {Item Type & Format S}, {Item Of Interest (Short)}.'),

   'ESM212': Citation_Style(
       category='Cemetery Records',
       type='Cemetery Office Records: Preservation Film, FHL-GSU, Cemetery office as lead element in Source List; emphasis on a single register',
       biblio='{Cemetery (Author)} ({Location}). "{Record Book}." {Microfilm Id}. {Film Repository}, {Repository Location}.',
       full='{Cemetery (Author)} ({Location}), "{Record Book}," {Page(S)}, {Item}; {Microfilm Id}.',
       short='{Cemetery} ({Location (Short)}), "{Record Book}," {Page(S) (Short)}.'),

   'ESM213': Citation_Style(
       category='Cemetery Records',
       type='Grave Markers: Rural, Cemetery as lead element in Source List',
       biblio='{Cemetery} ({Location}; {Access Data, Distance, Direction, Gps Reading, Etc.}). {Record Type}.',
       full='{Cemetery} ({Location}; {Access Data, Distance, Direction, Gps Reading, Etc.}), {Item}, {Data Collection Info}, {Date Read Or Photographed}.',
       short='{Cemetery} ({Location (Short)}), {Item}.'),

   'ESM214': Citation_Style(
       category='Cemetery Records',
       type='Grave Markers: Urban, Cemetery as lead element in Source List',
       biblio='{Cemetery} ({Location}). {Item Type Or Format}.',
       full='{Cemetery} ({Location}), {Item Of Interest}, {Section Lot Or Row}; {Data Collection Info}, {Date}.',
       short='{Cemetery} ({Location (Short)}), {Item Of Interest}.'),

   'ESM215': Citation_Style(
       category='Cemetery Records',
       type='Grave Markers: Images Online, Creator as lead element in Source List',
       biblio='{Creator}. <I>{Website Title}</I>. {Item Type Or Format}. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator}, <I>{Website Title}</I>, {Item Type Or Format} ({Url (Digital Location)} : {Date}), {Item Of Interest}.',
       short='{Creator}, <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM216': Citation_Style(
       category='Cemetery Records',
       type='Memorial Plaques, Cemetery as lead element in Source List',
       biblio='{Cemetery} ({Location}). {Item Type Or Format}.',
       full='{Cemetery} ({Location}), {Item}; {Data Collection Info}, {Date Read Or Photographed}.',
       short='{Cemetery} ({Location (Short)}), {Item (Short)}.'),

   'ESM217': Citation_Style(
       category='Cemetery Records',
       type='Derivatives: Cemetery Abstracts: Vertical File, Compiler unidentified - file as lead element in Source List',
       biblio='"{File Label}." {Item Type Or Format}. {Creation Date}. {Repository}, {Repository Location}.',
       full='"{File Label}" ({Item Type Or Format}, {Creation Date (Short)}, {Repository}, {Repository Location}), {Folder}; {Item Of Interest}.',
       short='"{File Label (Short)}," {Folder (Short)}, {Item Of Interest (Short)}.'),

   'ESM218': Citation_Style(
       category='Cemetery Records',
       type='Derivatives: Cemetery Abstracts Card File, Compiler unidentified - file as lead element in Source List',
       biblio='"{File Label}." {Item Type Or Format}. {Creation Date}. {Repository}, {Repository Location}.',
       full='"{File Label}" ({Item Type Or Format}, {Creation Date (Short)}, {Repository}, {Repository Location}), {Item Of Interest}.',
       short='"{File Label (Short)}," {Item Of Interest (Short)}.'),

   'ESM219': Citation_Style(
       category='Cemetery Records',
       type='Derivatives: Database Online, Compiler as lead element in Source List',
       biblio='{Creator (Last)}, {Creator (First)}. "{Database Title}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator (First)} {Creator (Last)}, "{Database Title}," {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}.',
       short='{Creator (Short)}, "{Database Title}," {Item Of Interest}.'),

   'ESM237': Citation_Style(
       category='Census Records',
       type='Original Manuscripts: Local Copy, Federal Census, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State, County)}. {Census Id (Generic)}, {Schedule & Copy}. {Repository1}, {Repository Location}.',
       full='{Census Id (Generic)}, {Jurisdiction (County, State)}, {Schedule} ({Copy Id}), {Civil Division(S)}, {Page(S)}, {Household Id}, {Person Of Interest}; {Repository2}, {Repository Location}.',
       short='{Census Id (Generic)}, {Jurisdiction (County, State) (Short)}, {Schedule & Copy (Short)}, {Civil Division(S) (Short)}, {Page(S)}, {Household Id (Short)}, {Person Of Interest}.'),

   'ESM238': Citation_Style(
       category='Census Records',
       type='Original Manuscripts: National Archives Copy, NARA Style citation for manuscript consulted on-site',
       biblio='{Series}. {Subgroup}. {Record Group (Name & No.)}. {Repository}, {Repository Location}',
       full='{Item Of Interest}, {Page(S)}, {Nara "File Unit" (Jurisdiction: Smallest To Largest)}; {Nara Series & Volume}; {Nara Subgroup}; {Nara Record Group (Name & No.)}; {Repository}, {Repository Location}.',
       short='{Item Of Interest (Short)}, {Page(S)}, {Jurisdiction (Short)}; {Nara Series & Subgroup (Short)}, {Record Group (Short)}, {Repository (Short)}.'),

   'ESM239': Citation_Style(
       category='Census Records',
       type='Digital Images: CD/DVD, Place & year as lead elements in Source List',
       biblio='{Jurisdiction1}. {Census Id (Generic)}, {Schedule}. <I>{Publication Title1}</I>. {Format}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id (Generic)}, {Jurisdiction2}, {Schedule}, {Geographic Division}, {Enumeration District (From 1880 Forward)}, {Page Id}, {Household}, {Person Of Interest}; <I>{Publication Title2}</I>, {Format} ({Publication Place}: {Publisher}, {Date}); {Credit Line (Source Of This Source)}.',
       short='{Census Id (Generic)}, {Jurisdiction3}, {Schedule (Short)}, {Enumeration District (Short)}, {Page Id}, {Household Id}, {Person Of Interest}.'),

   'ESM240': Citation_Style(
       category='Census Records',
       type='Digital Images: Online Commercial Site, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule}. {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Schedule}, {Civil Division(S)}, {Page Id}, {Household Id}, {Person(S) Of Interest}; {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}); {Credit Line (Source Of This Source)}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Schedule (Short)}, {Page Id}, {Household Id (Short)}, {Person(S) Of Interest}.'),

   'ESM241': Citation_Style(
       category='Census Records',
       type='Digital Images: Online Archives (France), Place & year as lead elements in Source List',
       biblio='{Jurisdiction}. {Census Id (Generic)}. {Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Census Id}, {Jurisdiction (Long)}, {Page(S)}, {Household Id}, {Person Of Interest}; {Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}); {Credit Line (Source Of This Source)}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Page(S)}, {Household Id (Short)}, {Person Of Interest}.'),

   'ESM242': Citation_Style(
       category='Census Records',
       type='Digital Images: Online Archives (U.K., Wales), Place & year as lead elements in Source List',
       biblio='{Jurisdiction}, {Census Id (Generic)}. {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Census Id}, {Jurisdiction (Short)}, {Civil Division(S)}, {Page Id}, {Person Of Interest}; {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}); {Credit Line (Source Of This Source)}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Civil Division(S)}, {Page Id}, {Person Of Interest}.'),

   'ESM243': Citation_Style(
       category='Census Records',
       type='Microfilm: Native-American Tribal Census, Citing agency & exact publication title; Place & year as lead elements in Source List',
       biblio='{Jurisdiction}. {Census Id (Generic: Year & Tribe)}. {Agency/Creator}. <I>{Publication Title}</I>. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (Short)}, {Page Id}, {Household Id}, {Person Of Interest}; {Agency/Creator}, <I>{Publication Title}</I>, {Film Id (Short)} ({Publication Place}: {Publisher}, {Year(S)}), {Roll No.}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Page Id}, {Household Id (Short)}, {Person Of Interest}.'),

   'ESM244': Citation_Style(
       category='Census Records',
       type='Microfilm: "Nonpopulation" Schedules: NARA Film, NARA film cited by number; not title; Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}. "{Schedule Title (Cited Exactly)}" Schedule. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, "{Schedule Title (Cited Exactly)}," {Section}, {Civil Division(S)}, {Enumeration District (From 1880 Forward)}, {Page(S) (Short)}, {Person Of Interest}; {Film Id}.',
       short='{Census Id}, {Jurisdiction (Short)}, "{Schedule Title (Cited Exactly)}," {Section}, {Civil Division(S) (Short)}, {Enumeration District (Short)}, {Page(S)}, {Person Of Interest}.'),

   'ESM245': Citation_Style(
       category='Census Records',
       type='Microfilm: "Nonpopulation" Schedules: FHL-GSU Preservation Film, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule (Generic Id)}. {Owner Repository}, {Repository Location}. {Film Id}. {Film Repository}, {Film Location}.',
       full='{Census Id (Generic)}, {Jurisdiction (County, State)}, {Schedule (Generic Id)}, {Page Id}, "{Item Of Interest}"; {Owner Repository}, {Repository Location}; {Film Id}.',
       short='{Census Id (Generic)}, {Jurisdiction (Short)}, {Schedule (Short)}, {Page Id}, "{Item Of Interest}."'),

   'ESM246': Citation_Style(
       category='Census Records',
       type='Microfilm: "Nonpopulation" Schedules: UNC Microfilm Publication, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule (Generic)}. <I>{Film Title}</I>. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Schedule}, {Page(S)}, {Person Of Interest}; <I>{Film Title}</I>, {Film Id (Short)} ({Publication Place}: {Publisher}, {Year(S)}), {Roll No.}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Schedule (Short)}, {Page(S)}, {Person Of Interest}.'),

   'ESM247': Citation_Style(
       category='Census Records',
       type='Microfilm: Population Schedules: 1790-1840, NARA film cited by number; not title;, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Civil Division(S)}, {Page Id}, {Person Of Interest}; {Film Id}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Civil Division(S)}, {Page Id}, {Person Of Interest}.'),

   'ESM248': Citation_Style(
       category='Census Records',
       type='Microfilm: Population Schedules: 1850-1870, NARA film cited by number; not title; Place & year as lead element in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule}. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Schedule}, {Civil Division(S)}, {Page Id}, {Household Id}, {Person(S) Of Interest}; {Film Id}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Schedule (Short)}, {Civil Division(S) (Short)}, {Page Id}, {Household Id (Short)}, {Person(S) Of Interest}.'),

   'ESM249': Citation_Style(
       category='Census Records',
       type='Microfilm: Population Schedules: 1850-1860: Slaves, NARA film cited by number; not title; Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule}. {Film Id}. {Publication Place}: {Published}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Schedule}, {Civil Division(S)}, {Page Id}, {Person(S) Of Interest}; {Film Id}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Schedule (Short)}, {Civil Division(S)}, {Page Id}, {Person(S) Of Interest}.'),

   'ESM250': Citation_Style(
       category='Census Records',
       type='Microfilm: Population Schedules: 1880-1930, NARA film cited by number; not title; Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule}. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id}, {Jurisdiction (County, State)}, {Schedule}, {Civil Division(S)}, {Page Id}, {Enumeration District & Sheet No.}, {Household Id}, {Person(S) Of Interest}; {Film Id}.',
       short='{Census Id}, {Jurisdiction (Short)}, {Civil Division(S) (Short)}, {Enumeration District & Sheet No. (Short)}, {Household Id (Short)}, {Person(S) Of Interest}.'),

   'ESM251': Citation_Style(
       category='Census Records',
       type='Microfilm: Population Schedules: State-Level Copies, In-House Preservation Film, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic)}, {Schedule & Copy1}. {Film Id}. {Owner/Repository}, {Location}.',
       full='{Census Id (Generic)}, {Jurisdiction (County, State)}, {Schedule & Copy2}, {Civil Division(S)}, {Page Id}, {Household Id}, {Person(S) Of Interest}; {Film Id}, {Owner/Repository}, {Location}.',
       short='{Census Id (Generic)}, {Jurisdiction (Short)}, {Schedule & Copy (Short)}, {Page Id}, {Household Id (Short)}, {Person(S) Of Interest}.'),

   'ESM252': Citation_Style(
       category='Census Records',
       type='Microfilm: State-Sponsored Censuses: FHL-GSU Preservation Film, Place & year as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Census Id (Generic) (Short)}, {Schedule}. {Repository}, {Repository Location}. {Film Id}. {Film Repository}, {Film Location}.',
       full='{Census Id (Generic)}, {Jurisdiction (County, State)}, {Schedule}, {Civil Division(S)}, {Page(S)}, {Household Id}, {Person(S) Of Interest}; {Repository}, {Location}; {Film Id}.',
       short='{Census Id (Generic)}, {Jurisdiction (Short)}, {Schedule (Short)}, {Civil Division(S) (Short)}, {Page(S)}, {Household Id (Short)}, {Person(S) Of Interest (Short)}.'),

   'ESM253': Citation_Style(
       category='Census Records',
       type='Derivatives: Database, CD/DVD, Compiler as lead element in Source List',
       biblio='<I>{Database (Publication) Title}</I>. {Record Format}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='<I>{Database (Publication) Title}</I>, {Record Format} ({Place Of Publication}: {Publisher}, {Year(S)}), {Item Of Interest, With Identifying Detail}; {Credit Line (Source Of This Source)}.',
       short='<I>{Database (Publication) Title}</I>, {Item Of Interest, With Abbreviated Detail}.'),

   'ESM254': Citation_Style(
       category='Census Records',
       type='Derivatives: Database Online, Compiler as lead element in Source List',
       biblio='{Compiler}. "{Database Title}." {Item Type Or Format}. {Website Creator/Owner (Short)}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Compiler}, "{Database Title}," {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='{Compiler}, "{Database Title}," {Item Of Interest (Short)}.'),

   'ESM255': Citation_Style(
       category='Census Records',
       type='Derivatives: Soundex & Miracode, Microfilm, NARA film cited by number; not title; Place & year as lead elements in Source List',
       biblio='{State}. {Census Id1}. {Film Id}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Census Id1}, {State}, {Code}, {Person(S) Of Interest}; {Film Id}.',
       short='{Census Id2}, {State}, {Code (Short)}, {Person(S) Of Interest (Short)}.'),

   'ESM256': Citation_Style(
       category='Census Records',
       type='Derivatives: Statistical Database, Online: User-Defined Reports, Compiler as lead elements in Source List',
       biblio='{Compiler}. "{Database Title}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Compiler}, "{Database Title}," {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}.',
       short='{Compiler (Short)}, "{Database Title}," {Item Of Interest}.'),

   'ESM311': Citation_Style(
       category='Church Records',
       type='Church Books: Named Volume: Held by Church, Church as lead element in Source List',
       biblio='{Church (Author)} ({Church Location}). "{Record Book Title}." {Repository}, {Repository Location}.',
       full='{Church (Author)} ({Location}), "{Record Book Title}," {Page(S)}, {Item Of Interest} ({Year(S)}); {Repository}, {Repository Location}.',
       short='{Church (Author)} ({Location (Short)}), "{Record Book Title}," {Page & Item}.'),

   'ESM312': Citation_Style(
       category='Church Records',
       type='Church Books: Named Volume: Archived Off-Site, Church & volume as lead elements in Source List',
       biblio='{Church (Author)} ({Location}). "{Record Book Title}." {Collection}, {Volume No.}. {Repository}, {Repository Location}.',
       full='{Church (Author)} ({Location}), "{Record Book Title}," {Page(S)}; {Collection}, {Volume No.}; {Repository}, {Repository Location}.',
       short='{Church (Short)}, "{Record Book Title (Short)}," {Page(S)}.'),

   'ESM313': Citation_Style(
       category='Church Records',
       type='Church Books: Numbered Volume: Archived Off-Site, Church & series as lead elements in Source List',
       biblio='{Church (Author)} ({Location}). {Record Series}. {Repository}, {Repository Location}.',
       full='{Church (Author)} ({Location}), {Record Book (Series & Volume No.)}, {Page(S)}, {Item Of Interest & Year}; {Repository}, {Repository Location}.',
       short='{Church (Author)} ({Location (Short)}), {Record Book}, {Page(S)}.'),

   'ESM314': Citation_Style(
       category='Church Records',
       type='Image Copies: Digitized Online, Church & series as lead elements in Source List',
       biblio='{Church (Author)} ({Location}). {Record Series}. {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Church (Author)} ({Location}), {Record Book Id (Generic Label)}, {Page(S)}, {Item Of Interest & Date For Unpaginated Entry}; {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Access Date}).',
       short='{Church (Author)} ({Location (Short)}), {Record Book Id (Generic Label)}, {Page(S)}, {Item (Short)}.'),

   'ESM315': Citation_Style(
       category='Church Records',
       type='Image Copies: Microfilm: FHL-GSU Preservation Copy, Church & series as lead elements in Source List',
       biblio='{Church (Author)} ({Location}). {Record Series}. {Owner/Repository}, {Repository Location}. {Film Id (Short)}. {Film Repository}, {Film Repository Location}.',
       full='{Church (Author)} ({Location}), {Record Book Id (Series & Volume)}, {Page(S)}, {Item Of Interest}; {Film Id}.',
       short='{Church (Author)} ({Location (Short)}), {Record Book Id (Short)}, {Page(S)}.'),

   'ESM316': Citation_Style(
       category='Church Records',
       type='Image Copies: Microfilm: LDS Records at FHL, Church & series as lead elements in Source List',
       biblio='{Church (Author)} ({Location}). {Series Title}. {Repository}, {Repository Location}. {Film Id}. {Film Repository}, {Film Location}.',
       full='{Church (Author)} ({Location}), {Record Book Id (Series & Volume)}, {Page(S)}, {Item Of Interest}; {Film Id}.',
       short='{Church (Short)}, {Record Book Id (Short)}, {Item}.'),

   'ESM317': Citation_Style(
       category='Church Records',
       type='Image Copies: Microfilm Publication, Publication title as lead element in Source List',
       biblio='<I>{Film Title}</I>. {Record Type}, {No. Of Rolls}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='<I>{Film Title}</I>, {Record Type}, {No. Of Rolls} ({Publication Place}: {Publisher}, {Year(S)}), {Roll Used}, {Page No. Or Arrangement}; {Record Date(S)}, "{Item Of Interest}."',
       short='<I>{Film Title}</I>, {Roll Used}, {Record Date(S) (Short)}, "{Item Of Interest}."'),

   'ESM318': Citation_Style(
       category='Church Records',
       type='Derivatives: Church-Issued Certificate, Multiple certificates cited as a collection in Source List, Name of church as lead element',
       biblio='{Church (Author)} ({Location}). {Collection (Generic Label)}. {Collection Owner}, {{Owner\'S Private Address}, }{Owner\'S Location}. {Year Owned}.',
       full='{Church (Author)} ({Location}), {Collection (Generic Label)} ({Collection Owner}, {{Owner\'S Private Address}, }{Owner\'S Location}, {Year Owned}), {Certificate Id (Who, When, What Event)}, {When Issued}, {Credit Line (Source Of This Source)}.',
       short='{Church (Author)} ({Location}), {Certificate Id (Short)}, {When Issued}.'),

   'ESM319': Citation_Style(
       category='Church Records',
       type='Derivatives: Church Record Book, Recopied, Church & volume as prime elements in Source List',
       biblio='{Church (Author)} ({Location}). {Record Book}. {Repository}, {Repository Location}.',
       full='{Church (Author)} ({Location}), {Record Book}, {Page(S)}, {Item Of Interest} ({Year(S)}); {Repository}, {Repository Location}.',
       short='{Church (Author)} ({Location (Short)}), {Record Book}, {Item (Short)}.'),

   'ESM320': Citation_Style(
       category='Church Records',
       type='Derivatives: Church Records Database, Online, Compiler as lead element in Source List',
       biblio='{Compiler (Last)}, {Compiler (First)} "{Database Title}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Compiler (First)} {Compiler (Last)}, "{Database Title}." {Item Type Or Format}. <I>{Website Title}</I> ({Url (Digital Location)}: {Date}), {Item Of Interest 1}; {Credit Line (Source Of This Source)}.',
       short='{Compiler (Short)}, "{Database Title}," {Item Of Interest 2}.'),

   'ESM373': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Original Records: Local Case Files, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series} File {File No.}, {Case Label}, For "{Item Of Interest}," {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)} File {File No.}, {Case Label (Short)}, {Item Of Interest (Short)}, {Record Date(S)}.'),

   'ESM374': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Original Records: Local Record Books, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series (Short)} {Specific Volume}:{Page(S)}, {Case Label And/Or Item Of Interest}, {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)} {Specific Volume}:{Page(S)}.'),

   'ESM375': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Original Records: Local Record Books, Archived Off-Site, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series2} {Specific Volume(S)}, {Page Or Court Term (If Unpaginated)}, {Case Label And/Or Item Of Interest}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)} {Specific Volume(S)}, {Page Or Court Term (If Unpaginated)}, {Case And/Or Item (Short)}.'),

   'ESM376': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Original Records: State-Level Appeals Court Record Books, State & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Series}. {Series No.}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (State)}, {Series}, {Specific Book}: {Page(S)}, {Case Label And/Or Item Of Interest}, {Record Date(S)}; {Archival Id}, {Repository}, {Repository Location}.',
       short='{Jurisdiction (State)}, {Series}, {Specific Book}: {Page(S)}, {Case And/Or Item (Short)}, {Record Date(S)}.'),

   'ESM377': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Original Records: State-Level Legislative Petitions & Files, State & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Series}. {Record Group No.}. {Repository}, {Repository Location}.',
       full='{Item Of Interest}, {Record Date(S)}; {Series} ({Archival Id Or Arrangement}), {Record Group No.}; {Repository}, {Repository Location}.',
       short='{Item Of Interest}, {Record Date(S)}; {Series}, {Jurisdiction}.'),

   'ESM378': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Image Copies: CD/DVD, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Item Type Or Format}. <I>{Publication Title}</I>. {Publication Format}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Jurisdiction (County, State)}, {Series} {Specific Volume(S)}: {Page(S) Or Term}; {Case Label And/Or Item Of Interest}; {Item Type Or Format}, <I>{Publication Title}</I>, {Publication Format} ({Publication Place}: {Publisher}, {Year(S)}).',
       short='{Jurisdiction (Short)}, {Series (Short)} {Specific Volume(S)}: {Page(S) Or Term}, {Case Label Or Item (Short)}.'),

   'ESM379': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Image Copies: Microfilm Archival Preservation Copy, Loose documents - jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Film Id}. {Repository}, {Repository Location}.',
       full='{Case Id Or Item Of Interest}, {Record Date(S)}, {Series}, {Archival Id Or Arrangement}; {Record Repository}, {Jurisdiction/Rep\'Y Location}; {Film Id}, {Frame Nos.}, {Film Repository}, {Repository Location}.',
       short='{Case Id Or Item Of Interest}, {Record Date(S)}, {Series}, {Jurisdiction (County)}.'),

   'ESM380': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Image Copies: Microfilm FHL-GSU Preservation Copy, Bound volume - jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (Country. Local)}. {Series}. {Record Repository}, {Repository Location}. {Film Id}. {Film Respository}, {Film Repository Location}.',
       full='{Jurisdiction (Local, Country)}, {Series}, {Page, Arrangement Or Archival Id}; {Item Of Interest}; {Record Repository}, {Repository Location}; {Film Id}.',
       short='{Jurisdiction (Short)}, {Series}, {Item (Short)}.'),

   'ESM381': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Image Copies: Online, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. City)}. {Series}. {Repository}, {Repository Location}. {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Jurisdiction (City, State)}, {Series} {Case File No.}, {Case Label}, {Court Term}, "{Item Of Interest}," {Record Date(S)}; {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}).',
       short='{Jurisdiction (Short)}, {Series (Short)} {Case File No.}, {Case Label (Short)}, {Court Term (Short)}, "{Item Of Interest (Short)}."'),

   'ESM382': Citation_Style(
       category='Local & State Records: Courts & Governance',
       type='Derivatives: Databases, Online, Database as lead element in Source List',
       biblio='"{Database Title}." {Item Type Or Format}. <I>{Website Title (Same As Creator)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format}, <I>{Website Title (Same As Creator)}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Item Type Or Format} {Item Of Interest (Short)}.'),

   'ESM421': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: File Items, Jurisdiction & series as lead elemlents in Source List',
       biblio='{Jurisdiction (State. County)}. {Series Or Collection}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series Or Collection}, {Item No. Or Arrangement}; {Item Of Interest}, {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series Or Collection}, {Item Of Interest (Short)}, {Record Date(S)}.'),

   'ESM422': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Files Moved to State Archives, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Record Series}. {Collection}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Record Series}, File: "{File}," {Item No. Or Arrangement}, {Item Of Interest}; <{Date (If Not In Title)}, >{Collection}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, File: "{File}," {Item Of Interest (Short)}.'),

   'ESM423': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Registers: Named Volume, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. City)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (City, State)}, "{Specific Volume(S)}," {Page No. Or Arrangement}, {Case And/Or Item}; <{Date (If Not In Title)}, >{Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, "{Specific Volume(S)}," {Page(S)}, {Case And/Or Item}.'),

   'ESM424': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Registers: Numbered Volume, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. City)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (City, State)}, {Series (Short)}, {Specific Volume(S)}: {Page(S)}, {Item Of Interest}< {Date (If Not In Title)}>; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)}, {Specific Volume(S)}: {Page(S)}, {Item Of Interest}.'),

   'ESM425': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Vital-Records Certificate, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}.'),

   'ESM426': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Vital-Records Register, Jurisdiction & volume as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. "{Specific Volume(S)}." {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, "{Specific Volume(S)}," {Section}, {Page(S)}, {Item Of Interest}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, "{Specific Volume(S)}," {Section & Page}, {Item Of Interest (Short)}.'),

   'ESM427': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Vital Records, Amended, Jurisiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}; {Credit Line (Source Of This Source)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S) (Short)}.'),

   'ESM428': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='Local Records: Vital Records, Delayed, Jurisdiction & series as lead elements in Source List',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}.'),

   'ESM429': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='State-Level Records: Miscellaneous Files, State & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Series}. {Record Group (Name & No.)}. {Repository}, {Repository Location}.',
       full='{Item Of Interest}, {Document}, {Record Date(S)}; {Series}; {Record Group (Name & No.)}; {Repository}, {Repository Location}.',
       short='{Item Of Interest (Short)}, {Document (Short)}.'),

   'ESM430': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='State-Level Records: Vital-Records Certificate, Jurisdiction, agency & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Agency/Creator}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (State)} {Agency/Creator}, {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (State)} {Certificate Type & No. 2} ({Certificate Date}), {Id Of Person(S)}.'),

   'ESM431': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='State-Level Records: Vital-Records Register, Jurisdiction, agency & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Agency/Creator}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (State)} {Agency/Creator}, {Series}, {Book & Page}, {Entry}, {Id Of Person(S)};< {Date (If Not In Title)},> {Repository}, {Repository Location}.',
       short='{Jurisdiction (State)} {Series}, {Book & Page}, {Entry}, {Id Of Person(S)}.'),

   'ESM432': Citation_Style(
       category='Local & State Records: Licenses, Registrations, Rolls, & Vital Records',
       type='State-Level Records: Vital Records, Amended, Jurisdiction, agency & series as lead elements in Source List',
       biblio='{Jurisdiction (State)}. {Agency/Creator}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (State)} {Agency/Creator}, {Certificate Type & No.} ({Certificate Date}) {Id Of Person(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (State)} {Certificate Type & No.} ({Certificate Date}), {Id Of Person(S) (Short)}.'),

   'ESM487': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Original Records: Local Case Files, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (State. City)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (City, State)}, {Series}, {File No. & Name} ({File Date}), {Item Of Interest}, {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series}, {File No. & Name} ({File Date}), {Item Of Interest}, {Record Date(S)}.'),

   'ESM488': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Original Records: Local Registers, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series (Short)}, {Volume & Page(S)}, {Item Of Interest (Parties & Type Of Document)}, {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)}, {Volume & Page(S)}.'),

   'ESM489': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Original Records: Local Tract Book, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (State. County)}. {Series}. {Repository}, {Repository Location}.',
       full='{Jurisdiction (County, State)}, {Series (Short)}, {Volume & Page No. Or Arrangement}; {Item Of Interest}, {Record Date(S)}; {Repository}, {Repository Location}.',
       short='{Jurisdiction (Short)}, {Series (Short)}, {Volume}: {Page(S)}, {Item Of Interest (Short)}, {Date}.'),

   'ESM490': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Original Records: State-Level Land-Grant Register, (Jurisdiction/agency & series as lead elements in Source List)',
       biblio='{Jurisdiction/Agency (State. Agency)}. {Series}. {Repository}, {Repository Location}.',
       full='{Item Of Interest}, {Record Date(S)}, "{Specific Volume(S)}," {Page(S)}; {Series Or Record Group}; {Repository}, {Repository Location}.',
       short='{Item Of Interest}, {Record Date(S)}, "{Specific Volume(S)}," {Page (Short)}.'),

   'ESM491': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Original Records: State-Level Land Warrants: Loose, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (State)}. {Series}. {Record Group}. {Repository}, {Repository Location}.',
       full='{Item Of Interest}, {Record Date(S)}; {Series2}, {Record Group}; {Repository}, {Repository Location}.',
       short='{Item Of Interest}, {Record Date(S)}, {Series2}, {Jurisdiction}.'),

   'ESM492': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Image Copies: CD/DVD, (Jurisdiction/agency & series as lead elements in Source List)',
       biblio='{Jurisdiction/Agency1}. {Series}. {Record Group}. {Repository}, {Repository Location}. {Item Type Or Format}. <I>{Publication Title}</I>. {Publication Format}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Jurisdiction/Agency2}, "{Specific Volume(S)}," {Page(S)}, {Item Of Interest}; {Item Type Or Format}, <I>{Publication Title}</I>, {Publication Format} ({Publication Place}: {Publisher}, {Year(S)}).',
       short='{Jurisdiction/Agency2}, "{Specific Volume(S)}," {Page(S)}, {Item Of Interest}.'),

   'ESM493': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Image Copies: Microfilm, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (Author) (State. City)}. {Series}. {Record Repository}, {Repository Location}. {Film Id}. {Film Repository}, {Film Location}.',
       full='{Jurisdiction (City, State)}, "{Specific Volume(S)}," {Page(S)}, {Item Of Interest}, {Record Date(S)}; {Film Id}.',
       short='{Jurisdiction (Short)}, "{Specific Volume(S)}," {Page(S) (Short)}.'),

   'ESM494': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Image Copies: Online, (Jurisdiction & series as lead elements in Source List)',
       biblio='{Jurisdiction (State. County)}, {Series}. {Repository}, {Repository Location}. {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Jurisdiction (County, State)}, {Specific Volume(S)}: {Page(S)}, "{Item Of Interest}," {Record Date(S)}; {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}).',
       short='{Jurisdiction (Short)}, {Specific Volume(S)}: {Page(S)}, "{Item Of Interest (Short)}," {Record Date(S)}.'),

   'ESM495': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Derivatives: Abstracts, Online, (Compiler & article title as lead elements in Source List)',
       biblio='{Creator Of Database (Last)}, {Creator Of Database (First)}. "{Article Title}."< {Item Type},> <{Site Owner Or Creator}, ><I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator Of Database (First)} {Creator Of Database (Last)}, "{Article Title}," <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}, {Record Date(S)}; {Credit Line (Source Of This Source)}.',
       short='{Creator (Short)}, "{Article Title}," <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM496': Citation_Style(
       category='Local & State Records: Property & Probates',
       type='Derivatives: Database, Online, (Database as lead element in Source List)',
       biblio='"{Database Title}."< {Item Type (If Necessary)},> <I>{Website Title (Same As Creator)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," <I>{Website Title (Same As Creator)}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," <I>{Website Title (Same As Creator)}</I>, {Item Of Interest}.'),

   'ESM539': Citation_Style(
       category='National Government Records',
       type='Audio Recordings: National Archives, Series as lead element in Source List',
       biblio='{Series}. {Record Group Title}, {Record Group No.}. {Repository}, {Repository Location}.',
       full='{File Unit}, {Date}, {Specific Data}, {File Unit No.}; {Series}; {Record Group Title}, {Record Group No.}; {Repository}, {Repository Location}.',
       short='{File Unit (Short)}, {Date}, {Specific Data}, {File Unit No.}, {Record Group No. (Short)}, {Repository (Short)}.'),

   'ESM540': Citation_Style(
       category='National Government Records',
       type='Manuscripts: Llibrary of Congress, Series as lead element in Source List',
       biblio='{Series1}. {Collection}. {Division}, {Repository}, {Repository Location}.',
       full='{Document Id}, {Document Date}; {Series2}; {Collection}; {Division}, {Repository}, {Repository Location}.',
       short='{Document Id (Short)}, {Document Date}, {Series/Collection}, {Repository}.'),

   'ESM541': Citation_Style(
       category='National Government Records',
       type='Manuscripts: National Archives, Series as lead element in Source List',
       biblio='{Series1}. {Subgroup}. {Record Group Title}, {Record Group No.}. {Repository1}, {Repository Location}.',
       full='{Document Id}, {Document Date}; {File Unit}, {File Unit No.}, {Subseries}, {Series2}; {Subgroup}; {Record Group Title}, {Record Group No.}; {Repository1}, {Repository Location}.',
       short='{Document Id}, {File Unit Id}, {Series3}, {Record Group No. (Short)}, {Repository2}.'),

   'ESM542': Citation_Style(
       category='National Government Records',
       type='Manuscripts: National Archives-Regional, Subgroup as lead element in Source List',
       biblio='{Subgroup1}. {Series}. {Record Group Title}. {Record Group No.}. {Repository}, {Repository Location}.',
       full='{Document Id}, {Document Date}; {File Unit}, {File Unit No.}; {Series}, {Subgroup2}; {Record Group Title}, {Record Group No.}; {Repository}, {Repository Location}.',
       short='{Document Id}, {File Unit (Short)}, {File Unit No.}. {Subgroup (Short)}, {Record Group No. (Short)}, {Repository (Short)}.'),

   'ESM543': Citation_Style(
       category='National Government Records',
       type='Maps: National Archives, Specific item as lead element in Source List',
       biblio='"{File Unit}." {Date}. {Series}. {Record Group Title}, {Record Group No.}. {Repository}, {Repository Location}.',
       full='"{File Unit}," {Date}; {Series}; {Record Group Title}, {Record Group No.}; {Repository}, {Repository Location}.',
       short='"{File Unit}," {Date (Short)}, {Series (Short)}, {Record Group No. (Short)}, {Repository (Short)}.'),

   'ESM544': Citation_Style(
       category='National Government Records',
       type='Photographs: Library of Congress, Subseries as lead element in Source List',
       biblio='{Subseries}. {Series}. {Collection}. {Library Division}, {Repository}, {Repository Location}.',
       full='"{Photograph Title}," {Photograph No.}, {Subseries}, {Series}; {Collection}; {Library Division}, {Repository}, {Repository Location}.',
       short='"{Photograph Title}," {Photograph No.}, {Collection}, {Repository}.'),

   'ESM545': Citation_Style(
       category='National Government Records',
       type='Railroad Retirement Board: Pension File, Individual file as lead element in Source List',
       biblio='{File Id (Last)}, {File Id (First)}. {File No.}, {File Year}. {Nara Record Group Title}. {Nara Record Group No.}. {Agency/Repository}, {Repository Location}.',
       full='{File Id (First)} {File Id (Last)}, {File No.}, {File Year}; {Nara Record Group Title}, {Nara Record Group No.}; {Agency/Repository}, {Repository Location}.',
       short='{File Id (First)} {File Id (Last)}, {File No.}, {File Year}, {Agency/Repository (Short)}.'),

   'ESM546': Citation_Style(
       category='National Government Records',
       type='Social Security Administration Forms SS-5, Agency as lead element in Source List',
       biblio='{Agency}. {Series}. {Agency Office/Repository}, {Repository Location}.',
       full='{Name}, {Social Security No.}, {Date}, {Item (From The Series Of The Same Name)}, {Agency/Repository}, {Repository Location}.',
       short='{Name}, {Social Security No.}, {Date (Short)}, {Item (From The Series Of The Same Name) (Short)}, {Agency/Repository}.'),

   'ESM547': Citation_Style(
       category='National Government Records',
       type='Databases: CD-ROM Publications, Agency/creator as lead element in Source List',
       biblio='{Creator}. <I>{Title}</I>. {Item Type Or Format}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='{Creator}, <I>{Title}</I>, {Item Type Or Format} ({Publication Place}: {Publisher}, {Year(S)}), {Item Of Interest}.',
       short='{Creator}, <I>{Title (Short)}</I>, {Item Of Interest}.'),

   'ESM548': Citation_Style(
       category='National Government Records',
       type='Databases Online: National Archives (Australia), Source List arranged geographically by country, then database as lead element',
       biblio='{Country}. "{Database Title}." {Item Type Or Format}. <I>{Website Title (Same As Creator-Owner)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format}, <I>{Website Title (Same As Creator-Owner)}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Item Type Or Format}, <I>{Website Title (Same As Creator-Owner)}</I>, {Item Of Interest}.'),

   'ESM549': Citation_Style(
       category='National Government Records',
       type='Databases Online: National Archives (Canada), Source List arranged geographically by country, then creator as lead element',
       biblio='{Country}. {Creator Of Database}. "{Database Title}." {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator Of Database}, "{Database Title}," {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='{Creator Of Database}, "{Database Title}," {Item Type Or Format}, <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM550': Citation_Style(
       category='National Government Records',
       type='Databases Online: National Archives (U.K.), Source List arranged geographically by country, then creator as lead element',
       biblio='{Country}. {Creator-Owner Of Database & Website (Short)}. "{Database Title}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator-Owner Of Database & Website}, "{Database Title}," {Item Type Or Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Item Type Or Format}, <I>{Website Title}</I>, {Item Of Interest}.'),

   'ESM551': Citation_Style(
       category='National Government Records',
       type='Databases Online: National Archives (U.S.), Database as lead element in Source List',
       biblio='"{Database Title}." {Item Type Or Format}. <I>{Website Title (Same As Creator-Owner)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format}, <I>{Website Title (Same As Creator-Owner)}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}, {Digital Id No.}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Item Type Or Format (Short)}, <I>{Website Title (Same As Creator-Owner)}</I>, {Item Of Interest (Short)}.'),

   'ESM552': Citation_Style(
       category='National Government Records',
       type='Image Copies: NARA Microfilm, NARA Style Citation, Series as lead element in Source List',
       biblio='{Series} ({Microfilm Id (Abbreviated) Pub\'N No. & Total Rolls}). {Subgroup}. {Record Group Title}, {Record Group No.}. {Repository}, {Repository Location}.',
       full='{File Unit}, {Date}; {Series} ({Film Id (No Title) Pub\'N No. & Specific Roll}); {Subgroup}; {Record Group Title}, {Record Group No.}; {Repository}, {Repository Location}.',
       short='{File Unit (Short)}, {Date}; {Series} ({Film Id (Short)}), {Record Group No. (Short)}, {Repository (Short)}.'),

   'ESM553': Citation_Style(
       category='National Government Records',
       type='Image Copies: NARA Microfilm Publications Style Citation, Publication title as lead element in Source List',
       biblio='<I>{Publication Title}</I>. {Publication No.}, {Total Rolls}. {Publication Place}: {Publisher}, {Year(S)}.',
       full='<I>{Publication Title}</I>, {Film Id (Publication No.)} ({Publication Place}: {Publisher}, {Year(S)}), {Specific Roll}, {Item Of Interest (County, State, Date & Po.)}.',
       short='<I>{Publication Title}</I>, {Film Id & Roll No.}, {Item Of Interest (Short)}.'),

   'ESM554': Citation_Style(
       category='National Government Records',
       type='Images Online: Library of Congress, Creator of database/website as lead element in Source List',
       biblio='{Creator/Owner Of Database & Website}. "{Title Of Database}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Creator/Owner Of Database & Website}, "{Title Of Database}," {Item Type Or Format2}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}, {Digital Id No.}; {Credit Line (Source Of This Source)}.',
       short='{Creator/Owner Of Database & Website}, "{Title Of Database (Short)}," <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM555': Citation_Style(
       category='National Government Records',
       type='Images Online: National Archives (U.S.), Citing as a published item, with database title as lead element in Source List',
       biblio='"{Database Title}." {Item Type Or Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format2}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), {Item Of Interest}, {Digital Id No.}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Digital File Type}, <I>{Website Title}</I>, {Item Of Interest (Short)}.'),

   'ESM556': Citation_Style(
       category='National Government Records',
       type='Images Online: Patent & Trademark Office (U.S.), Citing as a published item, with database title as lead element in Source List',
       biblio='"{Database Title}." <{Item Type Or Format}. ><I>{Website Title (Same As Creator-Owner)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format 2}, <I>{Website Title (Same As Creator-Owner)}</I> ({Url (Digital Location)} : {Date}), {Specific Item Of Interest}; {Credit Line (Source Of This Source)}.',
       short='"{Database Title}," {Specific Item Of Interest (Short)}.'),

   'ESM646': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Basic Format',
       biblio='{Author (Last)}, {Author (First)}. <I>{Main Title}: {Subtitle}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Main Title}: {Subtitle}</I> ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM647': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Chapter',
       biblio='{Author (Last)}, {Author (First)}. "{Chapter Title}." <I>{Book Title}</I>. {Book Editor (Short)} {Place Of Publication}: {Publisher}, {Year(S)}. {Chapter Pages}.',
       full='{Author (First)} {Author (Last)}, "{Chapter Title}," <I>{Book Title}</I>, {Book Editor} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, "{Chapter Title (Short)}," {Page(S) (Short)}.'),

   'ESM648': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Edited',
       biblio='{Editor (Last)}, {Editor (First)}. <I>"{Main Title}": {Subtitle}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Editor (First)} {Editor (Last)}, <I>"{Title}"</I> ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Editor (Last)}, <I>"{Title (Short)},"</I> {Page(S)}.'),

   'ESM649': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Multivolume Set',
       biblio='{Abstractor (Last)}, {Abstractor (First)} <I>{Title}</I>. {Volume Data}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Abstractor (First)} {Abstractor (Last)}, <I>{Title}</I>, {Volume Data (Short)} ({Place Of Publication}: {Publisher}, {Year(S)}), {Volume & Page(S)}.',
       short='{Abstractor (Last)}, <I>{Title}</I>, {Volume & Page(S)}.'),

   'ESM650': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Reprint, no new material added',
       biblio='{Author (Last)}, {Author (First)} <I>{Title}</I>. {Original Publication Year}. {New Format}, {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)} <I>{Title}</I> ({Original Publication Year}; {New Format}, {Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title}</I>, {Page(S)}.'),

   'ESM651': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Book: Revised Edition',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I>. {Edition Data}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I>, {Edition Data (Short)} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title}</I>, {Page(S)}.'),

   'ESM652': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Leaflet',
       biblio='{Author}. <I>{Title}</I>. {Format}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author}, <I>{Title}</I>, {Format} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author}, <I>{Title}</I>, {Page(S)}.'),

   'ESM653': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Print Publications: Map',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I> ({Place Of Publication}: {Publisher}, {Year(S)}).',
       short='{Author (Last)}, <I>{Title (Short)}</I> ({Year(S)}).'),

   'ESM654': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Electronic Publications: Audio Book',
       biblio='{Author (Last)}, {Author (First)}. <I>{Main Title}: {Subtitle}</I>. {Format/Edition}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Main Title}: {Subtitle}</I>, {Format/Edition (Short)} ({Place Of Publication}: {Publisher}, {Year(S)}), {Specific Location}.',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Specific Location}.'),

   'ESM655': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Electronic Publications: CD/DVD Book (Text)',
       biblio='{Author (Translator) (Last)}, {Author (Translator) (First)}. <I>{Title}</I>. {Format}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (Translator) (First)} {Author (Translator) (Last)}, <I>{Title}</I>, {Format} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Translator) (Last)}, <I>{Title}</I>, {Page(S)}.'),

   'ESM656': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Electronic Publications: Video',
       biblio='{Presenter (Last)}, {Presenter (First)}. <I>{Title}</I>. {Series}. {Format}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Presenter (First)} {Presenter (Last)}, <I>{Title}</I>, {Series}, {Format} ({Place Of Publication}: {Publisher}, {Year(S)}), {Specific Location}.',
       short='{Presenter (Last)}, <I>{Title (Short)}</I>, {Specific Location}.'),

   'ESM657': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Electronic Publications: Website As "Book", (Website devoted to one single item)',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title Of Website}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}), "{Item Of Interest}."',
       short='{Author (Last)}, <I>{Website Title}</I>, "{Item Of Interest}."'),

   'ESM658': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Image Copies: CD/DVD Publication',
       biblio='{Author (Last)}, {Author (First)} <I>{Title}</I>. {Original Publication Year}. {New Format}. <I>{Dvd Title}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I> ({Original Publication Year}), {New Format}, <I>{Dvd Title}</I> ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM659': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Image Copies: Microfilm, FHL-GSU (Preservation Copy), (Unpublished film of a published book)',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I> {Translation Of Title}. {Original Publication Data (Place: Publisher, Year)}. {Film Id}, {Position On Film}. {Film Repository}, {Film Repository Location}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I> {Translation Of Title} ({Original Publication Data (Place: Publisher, Year) (Short)}), {Page(S)}; {Film Id}, {Position On Film}.',
       short='{Author (Last)}, <I>{Title}</I>, {Page(S)}.'),

   'ESM660': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Image Copies: Microfilm Publication, (Commercially published microfilm)',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I>. {Original Publication Data (Place: Publisher, Year)}. <I>{Film Publication Series}</I>. {Roll & Item}. {Place Of Film Publication}: {Film Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I> ({Original Publication Data (Place: Publisher, Year)}), {Page(S)1}; <I>{Film Publication Series}</I> ({Place Of Film Publication}: {Film Publisher}, {Year(S)}), {Roll & Item}.',
       short='{Author (Last)}, <I>{Title}</I>, {Page(S)2}.'),

   'ESM661': Citation_Style(
       category='Publications: Books, CDs, Maps, Leaflets, & Videos',
       type='Image Copies: Online Publication',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I>. {Original Publication Year}. {New Format}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Title}</I> ({Original Publication Year}), {Page(S)}; {New Format}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}).',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM727': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Book: Basic Format, (Citing from title page)',
       biblio='{Author (Compiler) (Last)}, {Author (Compiler) (First)}. <I>{Title}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (Compiler) (First)} {Author (Compiler) (Last)}, <I>{Title}</I> ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM728': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Case Reporters: Series Named for Editor, (Citing individual volume from title page)',
       biblio='{Editor (Last)}, {Editor (First)}. <I>{Title}</I>. {Total Volumes}. {Place Of Publication}: {Publisher}, {Year(S)1}.',
       full='{Editor (First)} {Editor (Last)}, <I>{Title}</I>, {Total Volumes (Short)} ({Place Of Publication}: {Publisher}, {Publication Year}), {Volume/Page}, <I>{Case}</I> ({Year(S)2}); Hereinafter Cited As {Case Label (Legal Style)}.',
       short='{Case Label (Legal Style)}.'),

   'ESM729': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Case Reporters: Standardized Series, (Citing individual volume from title pages)',
       biblio='<I>{Title}</I>. {Specific Volume(S)}. <I>{Court Term/Subtitle}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='<I>{Title}</I>. {Specific Volume(S) (Short)}, <I>{Court Term/Subtitle}</I> ({Place Of Publication}: {Publisher}, {Publication Year}), {Pages}, <I>{Case}</I>; Hereinafter Cited As {Case Label (Legal Style)}.',
       short='{Case Label (Legal Style)}.'),

   'ESM730': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Codes & Statutes, Online: State Database',
       biblio='"{Database Title}." {Item Type Or Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='"{Database Title}," {Item Type Or Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date Published, Updated Or Accessed}), {Page(S)}, {Part}, Act: "{Title Of Act}."',
       short='"{Database Title (Short)}," {Page(S)}, "{Title Of Act}."'),

   'ESM731': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Codes & Statutes, Online: U.S. Code',
       biblio='{Author}. <I>{Name Of Code}</I>. {Edition}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Edition Year}.',
       full='"{Name Of Act}," {Title No.}, <I>{Name Of Code}</I>, {Part/Chapter/Section}; {Edition}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}).',
       short='"{Name Of Act}," {Citation (Legal Style) (Short)}.'),

   'ESM732': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Slip Law: Federal',
       biblio='{Author}. <I>{Title Of Act}</I>. {Act No.}.',
       full='<I>{Title Of Act}</I>, {Act No.}.',
       short='<I>{Title Of Act}</I>, {Act No.}.'),

   'ESM733': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Statutes: Federal, (Citing volume from title page)',
       biblio='{Author}. <I>{Title Of Series}</I>. {Specific Volume(S)}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author2}, <I>{Title Of Series}</I>, {Specific Volume(S) (Short)} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}, "{Title Of Act}."',
       short='<I>{Title Of Series}</I> {Specific Volume(S) (Short2)}: {Page(S)} ({Year(S)}), "{Title Of Act}."'),

   'ESM734': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Statutes: State,  (Citing volume from title page)',
       biblio='{Author (Last)}, {Author (First)}. <I>{Title}</I>. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (Compiler) (First)} {Author (Compiler) (Last)}, <I>{Title}</I> ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Last)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM735': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Congressional Records, (Citing volume from title page)',
       biblio='{Author}. <I>{Title}</I>. {Congress & Session}, {Document Id}. {Place Of Publication}: {Publisher}, {Year(S)}.',
       full='{Author (Short)}, <I>{Title}</I>, {Congress & Session (Short)}, {Document Id} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Short2)}, <I>{Title (Short)}</I>, {Page(S)}.'),

   'ESM736': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Congressional Records, (Traditional academic style)',
       biblio='{Author}. <I>{Series Title}</I>. {Congress}, {Session}. {Year(S)}.',
       full='{Author (Short)}, <I>{Document Title}</I>, {Congress & Session}, {Year(S)}, {Document Id} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}.',
       short='{Author (Short)2}, {Congress & Session}, {Year(S)}, {Document Id}.'),

   'ESM737': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='Congressional Records: Online Images',
       biblio='{Author}. <I>{Series Title}</I>. {Format}. {Website Creator/Owner}. <I>{Website Title}</I>. {Url (Digital Location)} : {Year(S)1}.',
       full='{Author (Short)}, <I>{Series Title}</I>, {Congress & Session} ({Year(S)2}), {Pages}, "{Item}"; {Format}, {Website Creator/Owner}, <I>{Website Title}</I> ({Url (Digital Location)} : {Date}).',
       short='{Author (Short2)}, <I>{Series Title}</I>, {Congress & Session}, {Pages}.'),

   'ESM738': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='National Archives (U.S.) Guides: Descriptive Pamphlet, Online',
       biblio='{Author}. <I>{Title Of Pamphlet}</I>. {Series Id}. {Edition}. <I>{Website Title (Same As Creator-Owner)}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Author (Short)}, <I>{Title Of Pamphlet}</I>, {Series Id}, {Edition}, <I>{Website Title (Same As Creator-Owner)}</I> ({Url (Digital Location)} : {Date}), {Page(S)}.',
       short='{Author (Short2)}, <I>{Title Of Pamphlet}</I>, {Series Id (Short)}, {Page(S)}.'),

   'ESM739': Citation_Style(
       category='Publications: Legal Works & Government Documents',
       type='National Archives (U.S.) Guides: Preliminary Inventory, Microfilmed',
       biblio='{Author (Last)}, {Author (First)} <I>{Book Title}</I>. {Series Id}. {Place Of Publication} : {Publisher}, {Year(S)}.',
       full='{Author (First)} {Author (Last)}, <I>{Book Title}</I>, {Series Id (Short)} ({Place Of Publication}: {Publisher}, {Year(S)}), {Page(S)}, {Item}.',
       short='{Author (Last)}, <I>{Book Title}</I>, {Page(S)}, {Item}.'),

   'ESM779': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Journal Articles: Print Editions',
       biblio='{Author (Last)}, {Author (First)} "{Article Title}: {Article Subtitle}." <I>{Journal Title}</I> {Volume Issue Date}: {Pages1}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}: {Article Subtitle}," <I>{Journal Title}</I> {Volume} ({Issue Date}): {Pages2}.',
       short='{Author (Last)}. "{Title (Short)}," {Pages3}.'),

   'ESM780': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Journal Articles: Online Archives of Print Journals',
       biblio='{Author (Last)}, {Author (First)} "{Article Title}: {Article Subtitle}." <I>{Journal Title}</I> {Volume} ({Issue Date}). {Edition}. <I>{Website Title}</I>. {Url (Digital Location)} : {Access Year}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}: {Article Subtitle}." <I>{Journal Title}</I> {Volume} ({Issue Date}); {Edition}, <I>{Website Title}</I> ({Url (Digital Location)} : {Access Date}), {Specific Content}.',
       short='{Author (Last)}, "{Title (Short)}," {Specific Content}.'),

   'ESM781': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Journal Articles: Online Journals',
       biblio='{Author (Last)}, {Author (First)}. "{Article Title}: {Article Subtitle}." <I>{Journal Title}</I> {Volume} ({Issue Date}). {Type Or Format}. {Url (Digital Location)} : {Year(S)}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}: {Article Subtitle}," <I>{Journal Title}</I> {Volume} ({Issue Date}), {Type Or Format} ({Url (Digital Location)} : {Date}), {Specific Content1}.',
       short='{Author (Last)}, "{Title (Short)}," {Specific Content2}.'),

   'ESM782': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Magazine Articles: Print Editions',
       biblio='{Authors (Last)}, {Authors (First)}. "{Article Title}." <I>{Magazine}</I> {Issue Date}, {Page(S)1}.',
       full='{Authors (First)} {Authors (Last)}, "{Article Title}," <I>{Magazine}</I> {Issue Date}, {Page(S)1}.',
       short='{Authors (Last)}, "{Article Title}," {Page(S)2}.'),

   'ESM783': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Magazine Articles: Online Reprints, Random Items',
       biblio='{Author (Last)}, {Author (First)}. "{Article Title}." {Original Publication Date}. {Item Type}, {Website Creator/Owner}, <I>{Website}</I>. {Url (Digital Location)} : {Year(S)}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}," {Website Creator/Owner}, <I>{Website}</I> ({Url (Digital Location)} : {Access Date}), {Specific Content1}; {Credit Line (Source Of This Source)}.',
       short='{Author (Last)}, "{Article Title}," {Specific Content2}.'),

   'ESM784': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Newsletter Articles: Print Editions',
       biblio='{Author (Last)}, {Author (First)}. "{Article Title}." <I>{Newsletter}</I> {Volume} ({Issue Date}): {Page(S)}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}," <I>{Newsletter}</I> {Volume} ({Issue Date}): {Page(S)}.',
       short='{Author (Last)}, "{Article Title (Short)}," {Page(S)}.'),

   'ESM785': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Newspaper Articles: Print Editions',
       biblio='{Location}. <I>{Newspaper1}</I>, {Issues Examined}.',
       full='"{Article Title}," <I>{Newspaper2}</I>, {Issue Date}, {Page & Column}.',
       short='"{Article Title}," {Page & Column2}.'),

   'ESM786': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Newspaper Articles: Online Archives',
       biblio='{Author (Last)}, {Author (First)}. "{Article Title}." <I>{Newspaper}</I> {Issue Date}. {Edition}. {Url (Digital Location) (Short)} : {Access Year}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}," <I>{Newspaper}</I>, {Issue Date}, {Edition} ({Url (Digital Location)} : {Access Date}), {Specific Content}; {Credit Line (Source Of This Source)}.',
       short='{Author (Last)}, "{Article Title}," {Specific Content}.'),

   'ESM787': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Broadcasts & Web Miscellanea: Blogs',
       biblio='{Author (Last)}, {Author (First)}. "{Article Title}." {Creator Of Blog}. <I>{Blog Name}</I> {Posting Date}. {Url (Digital Location)} : {Access Year}.',
       full='{Author (First)} {Author (Last)}, "{Article Title}," {Creator Of Blog}, <I>{Blog Name}</I>, {Posting Date} ({Url (Digital Location)} : {Access Date}), {Specific Content (Short)}.',
       short='{Author (Last)}, "{Article Title}," {Specific Content}.'),

   'ESM788': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Broadcasts & Web Miscellanea: Discussion Forums & Lists, (Source List Entry constructed to cover a number of postings)',
       biblio='<I>{Name Of Forum}</I>, {Type Of Forum}, {Date-Span Read}. {Url (Digital Location)}.',
       full='{Author (First)} {Author (Last)}, "{Message Title}," <I>{Name Of Forum}</I> {Type Of Forum}, {Posting Date} ({Url (Digital Location)} : {Access Date}).',
       short='{Author (Last)}, "{Message Title}," <I>{Name Of Forum}</I>, {Posting Date}.'),

   'ESM789': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Broadcasts & Web Miscellanea: Podcasts, (Source List Entry constructed to cover a single broadcast)',
       biblio='{Presenter Or Guest (Last)}, {Presenter Or Guest (First)}. "{Subject/Title}." {Item Type} By {Podcast Host}. <I>{Podcast Title}</I>, {Broadcast Date}. {Format}. <I>{Website (Where Archived)}</I>. {Url (Digital Location)} : {Access Year}.',
       full='{Presenter Or Guest (First)} {Presenter Or Guest (Last)}, "{Subject/Title}," {Item Type} By {Podcast Host}, <I>{Podcast Title}</I>, {Broadcast Date}, {Format}, <I>{Website (Where Archived)}</I> ({Url (Digital Location)} : {Access Date}), {Specific Content}.',
       short='{Presenter (Last)}, "{Subject/Title}," {Specific Content (Short)}.'),

   'ESM790': Citation_Style(
       category='Publications: Periodicals, Broadcasts & Web Miscellanea',
       type='Broadcasts & Web Miscellanea: Radio & Television Clips',
       biblio='{Presenters (Last)}, {Presenters (First)}. "{Clip Id}." <I>{Title Of Show}: {Segment}</I>, {Broadcast Date}. {Format}. {Network Or Producer}. <I>{Website}</I>. {Url (Digital Location)} : {Access Year}.',
       full='{Presenters (First)} {Presenters (Last)}, "{Clip Id}," <I>{Title Of Show}: {Segment}</I>, {Broadcast Date}, {Format}, {Network Or Producer}, <I>{Website}</I> ({Url (Digital Location)} : {Date}).',
       short='{Presenters (Last)}, "{Clip Id}."'),
}
