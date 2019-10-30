//{{toUpperCase jobname}} JOB ({{account}}),'IEFBR14'
//* This step will create the TSO session for REXX and read
//* from the SYSIN inline exec 
//TSOREXX  EXEC  PGM=IKJEFT1B
//SYSEXEC   DD  UNIT=SYSALLDA,SPACE=(80,(5,1)),
//          DSN=&SYSEXEC,
//          AVGREC=K,DSNTYPE=LIBRARY,
//          RECFM=FB,LRECL=80,DSORG=PO
//SYSUT2    DD  DISP=(OLD,PASS),VOL=REF=*.SYSEXEC,
//          DSN=&SYSEXEC(REXXSAMP)
//SYSIN     DD  DATA,DLM='%!'
{{rexxexec}}
%!
//SYSTSPRT  DD  SYSOUT=*
//SYSTSIN   DD  *
 repro infile(SYSIN) outfile(SYSUT2)
 %REXXSAMP
//*