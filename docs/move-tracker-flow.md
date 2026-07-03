# Move-Tracker — Erkennungs-Flow (v2, Spec 10)

Stand nach `specs/rework/10-move-detection-v2.md`: probabilistisches LL-Scoring
(z-Scores gegen per-Feld-Rauschmodell), Prior-Tie-Break, 2-Ply-Recovery,
Nudge-/Drift-Re-Anchor ohne CNN, CNN-Gegenkandidat, Promotion-Dialog.

```mermaid
flowchart TD
    START([chesslab track --profile --source --device]) --> S1[Kalibrierprofil laden<br/>Homographie + Ecken/Marker]
    S1 --> S2[Kamera öffnen<br/>URL: Grab-Latest MJPEG]
    S2 --> S3[MoveTracker bauen<br/>z_thr, LL-Margin, CNN-Run, config.TRACK_DEFAULTS]
    S3 --> S4[Web-UI starten :8001<br/>Loop-Thread startet]

    S4 --> U0[Nutzer baut Startstellung auf]
    U0 --> U1[[reset_to_start<br/>Brett = Start-FEN, ref = leer]]
    U1 --> BT

    %% ===== BASE-TRUTH =====
    subgraph ACQ [Base-Truth aufnehmen]
        BT{Brett ruhig &<br/>freie Sicht?}
        BT -- nein --> BTw[warte auf freie Sicht] --> BT
        BT -- ja --> BTset[[Base-Truth setzen<br/>ref = Bild + FEN]]
    end
    BTset --> LOOP

    %% ===== LAUFENDE ANALYSE =====
    subgraph ENGINE [Analyse-Schleife pro Frame]
        LOOP[Frame → Warp → Motion-Gate<br/>inkl. ROI ÜBER Brettrand] --> LG{stabil?}
        LG -- nein / Hand bewegt --> LOOP
        LG -- ja --> LD[Diff vs Base-Truth → Median-Norm →<br/>z-Scores per Rauschmodell<br/>+ HSV-Schatten-Veto + Census]
        LD --> LLS[LL-Score je legaler Zug<br/>viabel: beide Endpunkte z ≥ z_thr/2]
        LLS --> LDx{Ergebnis?}
        LDx -- "ruhig (best-LL < Floor)" --> LNM[[Re-Anchor +<br/>Rauschmodell lernt]] --> LOOP
        LDx -- schwache Evidenz --> LHOLD[Referenz HALTEN<br/>weiter sammeln] --> LOOP
        LDx -- "mehrdeutig (LL-Margin)" --> LPRIOR{Prior<br/>entscheidet?}
        LPRIOR -- ja --> LV
        LPRIOR -- Promotion o. CNN --> LPROMO[UI: Figur wählen<br/>Q/R/B/N] --> LCOMMIT
        LPRIOR -- nein --> LAMB[Kandidaten anzeigen<br/>bitte sauber ziehen] --> LOOP
        LDx -- ein viabler Zug --> LV{CNN aktiv?}
        LDx -- viele/unerklärt --> LSTUCK[STUCK]
        LV -- nein --> LCOMMIT
        LV -- ja --> LVER[CNN-Verify<br/>mehrere Frames]
        LVER -- bestätigt --> LCOMMIT[[Zug COMMIT<br/>Prior-Entscheid markiert]]
        LVER -- Ghost/Schatten --> LRE
        LVER -- CNN-Gegenkandidat<br/>belastbar --> LOVR[[CNN überstimmt Diff<br/>anderer Zug COMMIT]] --> M1
        LSTUCK --> LREC[CNN-Recovery<br/>1–2 Halbzüge tief]
        LSTUCK -- ohne CNN,<br/>1–2 Felder persistent --> LPATCH[[Nudge/Drift:<br/>Referenz-Zellen patchen]] --> LOOP
        LREC -- echter Zug / Zugpaar --> LCOMMIT
        LREC -- Brett unverändert --> LRE[[Referenz nachziehen]]
        LREC -- weicht ab --> LWARN[Warnung / Resync?]
        LRE --> LOOP
        LWARN --> LOOP
    end

    LCOMMIT --> M1[Brett + FEN + Historie<br/>+ Board-SVG aktualisieren]
    M1 --> M2[Base-Truth = neue Stellung<br/>Farbe am Zug wechselt]
    M2 --> GO{Partie zu Ende?<br/>Matt / Patt}
    GO -- nein --> LOOP
    GO -- ja --> END([Ergebnis anzeigen<br/>1-0 / 0-1 / ½-½])

    %% ===== NEBENFLÜSSE =====
    PERIOD[/alle N s: CNN-Kontrolle<br/>Brett == Spielzustand?/] -. Abweichung .-> LWARN
    PERIOD -. stimmt .-> LOOP

    UACT[/Nutzer jederzeit/] --> UA1[Undo] --> LOOPr[Referenz neu aufnehmen] --> BT
    UACT --> UA2[Resync auf FEN] --> LOOPr
    UACT --> UA3[Resync per CNN] --> M1
    UACT --> UA4[Neustart] --> U1

    classDef good fill:#14532d,stroke:#22c55e,color:#dcfce7;
    classDef bad fill:#7f1d1d,stroke:#ef4444,color:#fee2e2;
    classDef cnn fill:#1e3a8a,stroke:#3b82f6,color:#dbeafe;
    classDef setup fill:#3730a3,stroke:#818cf8,color:#e0e7ff;
    classDef term fill:#111827,stroke:#9ca3af,color:#f9fafb;
    class LCOMMIT,BTset,LRE,LNM,LPATCH,LOVR good;
    class LSTUCK,LWARN,LAMB bad;
    class LVER,LREC,UA3,PERIOD cnn;
    class S1,S2,S3,S4 setup;
    class START,END term;
```

## Kernentscheidungen (Kurzreferenz)

| Mechanik | Wo | Kern |
|---|---|---|
| Rauschmodell | `tracker.SquareNoise` | EMA mean/std je Feld, nur in Ruhe geupdatet, std-Floor 1.5 |
| Zug-Score | `tracker.loglik_scores` | Σ k·(z − z_thr) über berührte Felder, geklippt ±12 |
| Viabilität | `_try_detect` | beide Endpunkte z ≥ z_thr/2 (ersetzt −1000-Strafe) |
| Re-Anchor | `_try_detect` | nur wenn nichts über z_thr UND best-LL < `reanchor_ll_floor` |
| Prior | `tracker.move_prior` | Schlag +0.5, Schach +0.3, vorwärts +0.2, Kappe 1.0; Commit markiert |
| Nudge/Drift | `_maybe_patch_anomaly` | ohne CNN: 1–4 Felder persistent → Zellen-Patch (belegt 5 s, leer 30 s) |
| Geometrie-Invalidierung | `_corners_jumped` | Warp-Ecke > 6 px seit Referenzaufnahme → Base-Truth neu aufnehmen |
| 2-Ply | `cnn_recovery.derive_moves_identity` | Einzelzug bevorzugt; Paar nur mit Margin gegen Paar UND Einzelzug |
| Gegenkandidat | `_verify_tick` | CNN-Alternative committet, wenn identitäts-belastbar bestätigt |
| Promotion | `_promo_pending` / `/api/promote` | ohne CNN: UI-Wahl; mit CNN: Zielfeld-Label entscheidet |

Alle Schwellen: `config.TRACK_DEFAULTS`, überschreibbar via `chesslab track`-Flags.
