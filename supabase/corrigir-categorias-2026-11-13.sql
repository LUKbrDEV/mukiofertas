-- Correção de categorias das ofertas no ar (revisão de 13/11/2026: 996 ofertas conferidas, 95 corrigidas).
-- Rode no Supabase: SQL Editor -> New query -> cole tudo -> Run.
-- A coleta agora mantém a categoria já gravada, então estas correções não são desfeitas pelo robô.

begin;

update public.ofertas set categoria = 'academia' where id in (15140, 32349, 32367, 32476, 14485, 32484, 32494);
update public.ofertas set categoria = 'acessorios-carro' where id in (20412, 32403, 32423, 32434, 32330, 29170, 11985, 21999, 32365, 33622, 25211, 32350, 28458, 30566, 30575, 20186, 20723, 31645, 31649);
update public.ofertas set categoria = 'acessorios-notebook' where id in (31125);
update public.ofertas set categoria = 'acessorios-tv' where id in (30202, 33647);
update public.ofertas set categoria = 'air-fryer' where id in (27808);
update public.ofertas set categoria = 'arvores-de-natal' where id in (27726, 30310, 30320, 32416, 32487);
update public.ofertas set categoria = 'barbear' where id in (28269);
update public.ofertas set categoria = 'brinquedos' where id in (30894, 30877);
update public.ofertas set categoria = 'cabelos' where id in (31305);
update public.ofertas set categoria = 'cadeiras-mesas' where id in (30898, 33665);
update public.ofertas set categoria = 'camisas-de-time' where id in (23585);
update public.ofertas set categoria = 'camping-pesca' where id in (12245, 12352);
update public.ofertas set categoria = 'carrinhos' where id in (31253);
update public.ofertas set categoria = 'casa' where id in (12590, 33645, 33649, 33624, 26827);
update public.ofertas set categoria = 'casa-inteligente' where id in (29410);
update public.ofertas set categoria = 'celulares' where id in (28603);
update public.ofertas set categoria = 'consoles' where id in (30245);
update public.ofertas set categoria = 'controles' where id in (4856, 33269, 33318, 12565);
update public.ofertas set categoria = 'doces-snacks' where id in (31261);
update public.ofertas set categoria = 'educativos' where id in (8384, 8397);
update public.ofertas set categoria = 'eletroportateis' where id in (31890, 32056, 33623, 31417, 28274);
update public.ofertas set categoria = 'fones' where id in (31588);
update public.ofertas set categoria = 'higiene-bebe' where id in (32692);
update public.ofertas set categoria = 'higiene-pessoal' where id in (30601);
update public.ofertas set categoria = 'jardim' where id in (32357, 31218);
update public.ofertas set categoria = 'lavadoras' where id in (30978);
update public.ofertas set categoria = 'maquiagem' where id in (30199, 30957, 31322);
update public.ofertas set categoria = 'memoria-ram' where id in (31895);
update public.ofertas set categoria = 'moda-feminina' where id in (32068, 14786);
update public.ofertas set categoria = 'monitor' where id in (28276);
update public.ofertas set categoria = 'moto' where id in (25864, 20704, 32527);
update public.ofertas set categoria = 'outros-informatica' where id in (33555);
update public.ofertas set categoria = 'perifericos' where id in (23121);
update public.ofertas set categoria = 'racao' where id in (28718);
update public.ofertas set categoria = 'relogios' where id in (27347);
update public.ofertas set categoria = 'skincare' where id in (30701, 31494);
update public.ofertas set categoria = 'som-automotivo' where id in (20478, 31602, 31609, 32485);
update public.ofertas set categoria = 'suplementos' where id in (28278, 29364, 33595, 29478);

commit;

-- Conferência: deve mostrar 95 linhas
select id, categoria, left(titulo, 70) as titulo from public.ofertas where id in (32357, 4856, 28276, 20412, 32403, 32423, 32434, 30601, 30701, 12590, 32330, 28278, 29364, 20478, 31602, 31609, 32485, 29170, 12245, 15140, 28269, 30898, 31890, 32056, 32349, 32367, 32476, 33623, 27347, 25864, 31588, 33269, 33318, 27726, 30310, 30320, 32416, 32487, 31218, 28718, 33595, 33645, 33649, 14485, 32484, 32494, 27808, 31417, 11985, 21999, 32365, 30199, 33622, 33624, 20704, 31125, 31305, 31494, 25211, 28274, 8384, 12565, 30245, 33665, 30957, 30978, 31322, 32350, 30894, 12352, 31261, 28458, 30566, 30575, 32527, 32068, 23585, 28603, 26827, 30877, 31895, 33555, 29410, 8397, 31253, 32692, 29478, 14786, 20186, 20723, 31645, 31649, 23121, 30202, 33647) order by categoria, id;
