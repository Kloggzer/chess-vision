-- Zwei Rollen, weil die Schreibhoheit ERZWUNGEN gehoert und nicht vereinbart.
--
-- Die Pipeline misst, der Mensch urteilt. Kein Konto darf beides schreiben: eine Aufteilung,
-- an die sich jemand halten muss, ist keine.

do $$ begin
    if not exists (select from pg_roles where rolname = 'chesslab_pipeline') then
        create role chesslab_pipeline login password 'chesslab_pipeline';
    end if;
    if not exists (select from pg_roles where rolname = 'chesslab_web') then
        create role chesslab_web login password 'chesslab_web';
    end if;
end $$;

grant usage on schema public to chesslab_pipeline, chesslab_web;
grant select on all tables in schema public to chesslab_pipeline, chesslab_web;

-- Die Pipeline schreibt die Messungen.
grant insert, update, delete on recording, frame, matte to chesslab_pipeline;

-- Die Web-App schreibt die Urteile.
grant insert, update, delete on review_note to chesslab_web;
grant usage, select on sequence review_note_id_seq to chesslab_web;
