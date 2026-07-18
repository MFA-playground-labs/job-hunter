-- Replace this UUID with the real single-user auth.users id before applying.
do $$
declare dev_owner_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into companies (owner_id, name, ats_type, ats_slug, tier, source) values
    (dev_owner_id, 'Anthropic', 'greenhouse', 'anthropic', 'watch', 'seed'),
    (dev_owner_id, 'OpenAI', 'ashby', 'openai', 'watch', 'seed'),
    (dev_owner_id, 'Sierra', 'ashby', 'sierra', 'watch', 'seed'),
    (dev_owner_id, 'Ramp', 'ashby', 'ramp', 'watch', 'seed'),
    (dev_owner_id, 'Vercel', 'greenhouse', 'vercel', 'watch', 'seed'),
    (dev_owner_id, 'Notion', 'greenhouse', 'notion', 'watch', 'seed'),
    (dev_owner_id, 'Retool', 'greenhouse', 'retool', 'watch', 'seed'),
    (dev_owner_id, 'Mercury', 'greenhouse', 'mercury', 'watch', 'seed'),
    (dev_owner_id, 'Decagon', 'ashby', 'decagon', 'watch', 'seed'),
    (dev_owner_id, 'Harvey', 'ashby', 'harvey', 'watch', 'seed'),
    (dev_owner_id, 'Scale AI', 'greenhouse', 'scaleai', 'watch', 'seed'),
    (dev_owner_id, 'Perplexity', 'greenhouse', 'perplexityai', 'watch', 'seed'),
    (dev_owner_id, 'Glean', 'greenhouse', 'glean', 'watch', 'seed'),
    (dev_owner_id, 'Anysphere', 'ashby', 'anysphere', 'watch', 'seed'),
    (dev_owner_id, 'Linear', 'ashby', 'linear', 'watch', 'seed'),
    (dev_owner_id, 'Brex', 'greenhouse', 'brex', 'watch', 'seed')
  on conflict (owner_id, lower(name)) do nothing;
end $$;
