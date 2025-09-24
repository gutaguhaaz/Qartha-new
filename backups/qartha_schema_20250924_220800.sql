-- Respaldo de esquema generado el Wed Sep 24 10:08:00 PM UTC 2025
-- Base: Development (postgresql://neondb_owner:npg_Xsudlv4BF0Ww@ep-empty-pond-aeqjiaws.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require)

-- Error obteniendo estructura de tablas

-- Indices y constraints (si existen)
 CREATE UNIQUE INDEX devices_pkey ON public.devices USING btree (id);
 CREATE INDEX idx_devices_cluster_project_idf ON public.devices USING btree (cluster, project, idf_code);
 CREATE UNIQUE INDEX idfs_cluster_project_code_key ON public.idfs USING btree (cluster, project, code);
 CREATE UNIQUE INDEX idfs_pkey ON public.idfs USING btree (id);
 CREATE INDEX idx_idfs_cluster_project_code ON public.idfs USING btree (cluster, project, code);
 CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
 CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

