; Default install folder proposal: D:\appManager (the user can still change it).
; Only applied if D:\ exists and no previous installation was found.
!macro customInit
  ${IfNot} ${FileExists} "$INSTDIR\*.*"
    ${If} ${FileExists} "D:\*.*"
      StrCpy $INSTDIR "D:\appManager"
    ${EndIf}
  ${EndIf}
!macroend
