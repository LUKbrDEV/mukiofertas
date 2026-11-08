-- Ranking: o XP de like passa a ser pelos likes que a pessoa DÁ (tabela likes_usuarios),
-- como diz a regra do site: "Curtir um produto: +2 XP (1 vez por produto)".
-- Antes contava os likes que as ofertas enviadas pela pessoa RECEBERAM.
-- Rode no Supabase: SQL Editor → New query → cole tudo → Run.

create or replace function public.xp_dos_membros(p_desde timestamp with time zone)
returns table(user_id uuid, xp integer, ofertas integer, likes integer, comentarios integer, ultima timestamp with time zone)
language sql
stable security definer
set search_path to 'public'
as $function$
  with ap as (           -- ofertas enviadas e aprovadas
    select s.user_id,
           count(*)::int as qtd,
           max(s.aprovada_em) as ultima
    from sugestoes s
    where s.user_id is not null and s.aprovada_em is not null and s.aprovada_em >= p_desde
    group by s.user_id
  ),
  lk as (                -- likes dados (1 por produto, a tabela já não deixa repetir)
    select l.user_id,
           count(distinct l.oferta_id)::int as qtd,
           max(l.criado_em) as ultima
    from likes_usuarios l
    where l.criado_em >= p_desde
    group by l.user_id
  ),
  cm as (                -- comentários (1 por produto)
    select c.user_id,
           count(distinct c.oferta_id)::int as qtd,
           max(c.criado_em) as ultima
    from comentarios c
    where c.user_id is not null and c.criado_em >= p_desde
    group by c.user_id
  ),
  quem as (
    select ap.user_id from ap union select lk.user_id from lk union select cm.user_id from cm
  )
  select q.user_id,
         (coalesce(ap.qtd, 0) * ranking_xp_por_oferta()
          + coalesce(lk.qtd, 0) * ranking_xp_por_like()
          + coalesce(cm.qtd, 0) * ranking_xp_por_comentario())::int,
         coalesce(ap.qtd, 0),
         coalesce(lk.qtd, 0),
         coalesce(cm.qtd, 0),
         greatest(ap.ultima, lk.ultima, cm.ultima)
  from quem q
  left join ap on ap.user_id = q.user_id
  left join lk on lk.user_id = q.user_id
  left join cm on cm.user_id = q.user_id;
$function$;

-- Conferência: XP de cada pessoa neste mês (o seu amigo deve aparecer com likes = 1 e xp = 2)
select u.email, x.xp, x.ofertas, x.likes, x.comentarios
from xp_dos_membros(inicio_do_mes()) x
join auth.users u on u.id = x.user_id
order by x.xp desc
limit 20;
