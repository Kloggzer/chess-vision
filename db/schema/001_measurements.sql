-- Die Messreihen: was die Pipeline misst. Eine Zeile je Frame und Quelle.
--
-- Der Grund fuer die ganze Migration steht in `matte.state`: "nicht gemessen", "abgelehnt" und
-- "gemessen, nichts verdeckt" sind DREI Zustaende, und sie zu verwechseln war in der Nacht auf
-- den 2026-09-16 neunzehn Mal ein Fehler. Eine Spalte mit Default 0.0 waere dieselbe Falle wie
-- `.get(k, 0.0)` -- deshalb: NOT NULL, wo ein Wert gemessen sein MUSS, echtes NULL sonst,
-- und nie ein Default.

create table if not exists recording (
    name       text primary key,
    session_id text not null unique,
    profile    text not null
);

-- Ein Brett ist eine DATEI, keine Zeile. `board_stamp` ist Mtime:Groesse (wie
-- `chesslab.provenance`), damit eine Abweichung zwischen DB und Platte auffaellt statt
-- still zu sein -- die Fehlerklasse, die diese Migration NEU einfuehrt.
create table if not exists frame (
    recording    text    not null references recording (name) on delete cascade,
    stem         text    not null,
    ply          integer,
    fen          text,
    dirty        boolean not null default false,
    dirty_reason text,
    board_path   text,
    board_size   integer,
    board_border integer,
    board_stamp  text,
    primary key (recording, stem),
    constraint frame_board_is_complete check (
        board_path is null
        or (board_size is not null and board_border is not null and board_stamp is not null)
    )
);

create table if not exists matte (
    recording   text not null,
    stem        text not null,
    source      text not null default 'sam',
    skipped     text,
    coverage    real[],
    concepts    jsonb,
    alpha_path  text,
    alpha_stamp text,
    measured_at timestamptz not null default now(),
    primary key (recording, stem, source),
    foreign key (recording, stem) references frame (recording, stem) on delete cascade,
    -- Entweder SAM hat abgelehnt ODER es gibt eine Messung. Nie beides, nie keines.
    constraint matte_state check ((skipped is null) <> (coverage is null)),
    -- `coverage_of` zippt `all_squares()` unter `strict=True`: eine Messung traegt IMMER alle 64.
    -- Ein fehlendes Feld heisst damit "der Frame ist ungemessen", nie "dieses Feld nicht".
    -- `coalesce`, nicht nackt: `array_length('{}', 1)` ist NULL, und eine CHECK-Bedingung, die zu
    -- NULL auswertet, GILT in Postgres. Ein leeres Array waere sonst "gemessen, null Felder".
    constraint matte_dense check (
        coverage is null or coalesce(array_length(coverage, 1), 0) = 64
    )
);

create index if not exists matte_by_recording on matte (recording);

-- Die Urteile des Menschen. Ein Urteil gilt fuer EIN Frame oder EIN Ply-Intervall, nie fuer beides.
create table if not exists review_note (
    id        bigserial primary key,
    recording text        not null references recording (name) on delete cascade,
    stem      text,
    ply       integer,
    verdict   text        not null,
    reason    text,
    noted_at  timestamptz not null default now(),
    constraint review_note_target check ((stem is null) <> (ply is null))
);

create index if not exists review_note_by_recording on review_note (recording);

-- Gegen die laufende Datenbank bewiesen (2026-09-16), jede Zusage einmal verletzt:
--   matte ohne beides          -> matte_state
--   matte mit skipped UND coverage -> matte_state
--   coverage = '{}'            -> matte_dense   (deshalb das `coalesce`: array_length('{}',1)
--                                                ist NULL, und eine NULL-CHECK GILT)
--   coverage mit 63 Feldern    -> matte_dense
--   board_path ohne Stempel    -> frame_board_is_complete
--   Urteil mit stem UND ply    -> review_note_target
-- Und die drei gueltigen Zustaende kommen zurueck: abgelehnt, gemessen, keine Zeile.
