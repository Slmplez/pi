export const ASCET_SEARCH_SQLITE_SCHEMA_VERSION = 3;

export const ASCET_P0_INDEX_AREAS = [
	"components",
	"folders",
	"folder_items",
	"elements",
	"methods",
	"project_formulas",
	"project_items",
	"component_refs",
	"element_refs",
	"messages",
	"dbitem_dependencies",
	"code_blocks",
	"code_terms",
] as const;

export type AscetP0IndexArea = (typeof ASCET_P0_INDEX_AREAS)[number];

/** Single source of truth for logical refresh partitions and their SQLite areas. */
export const ASCET_LOGICAL_INDEX_AREA_MAP: Readonly<Record<string, readonly AscetP0IndexArea[]>> = {
	p0: ASCET_P0_INDEX_AREAS,
	all: ASCET_P0_INDEX_AREAS,
	components: ["components"],
	tree: ["folders", "folder_items", "components"],
	element_decls: ["elements"],
	elements: ["elements"],
	method_decls: ["methods"],
	methods: ["methods"],
	component_refs: ["component_refs", "element_refs"],
	element_refs: ["component_refs", "element_refs"],
	refs: ["component_refs", "element_refs", "dbitem_dependencies"],
	text_code: ["code_blocks", "code_terms"],
	messages: ["messages"],
	project: ["project_items", "project_formulas"],
};

export const ASCET_REQUIRED_P0_INDEX_AREAS = [
	"components",
	"folders",
	"folder_items",
	"elements",
	"methods",
	"project_formulas",
	"project_items",
	"component_refs",
	"element_refs",
	"messages",
	"dbitem_dependencies",
	"code_blocks",
	"code_terms",
] as const satisfies readonly AscetP0IndexArea[];

export const ASCET_SEARCH_SQLITE_SCHEMA_SQL = `
create table if not exists ascet_index_runs (
  id text primary key,
  schema_version integer not null,
  database_name text not null default '',
  database_path text not null default '',
  api_version text not null default '',
  source_fingerprint text not null default '',
  component_list_hash text not null default '',
  status text not null,
  active integer not null default 0,
  started_at_ms integer not null,
  generated_at_ms integer not null,
  completed_at_ms integer not null default 0,
  elapsed_ms integer not null default 0,
  error_json text not null default ''
);

create table if not exists ascet_index_areas (
  run_id text not null,
  area text not null,
  status text not null,
  item_count integer not null default 0,
  elapsed_ms integer not null default 0,
  scan_complete integer not null default 1,
  error_code text not null default '',
  error_message text not null default '',
  primary key (run_id, area)
);

create table if not exists ascet_search_documents (
  doc_id text primary key,
  run_id text not null,
  partition text not null,
  kind text not null,
  name text not null,
  name_norm text not null,
  path text not null,
  path_norm text not null,
  owner_path text not null default '',
  owner_path_norm text not null default '',
  scope text not null default '',
  runtime_type text not null default '',
  language_kind text not null default '',
  source_api text not null default '',
  rank_base integer not null default 0,
  payload_json text not null default '{}'
);

create table if not exists ascet_components (
  id text primary key,
  run_id text not null,
  path text not null,
  path_norm text not null,
  name text not null,
  name_norm text not null,
  component_kind text not null default '',
  language_kind text not null default '',
  runtime_type text not null default '',
  parent_path text not null default '',
  payload_json text not null default '{}'
);

create table if not exists ascet_folders (
  id text primary key,
  run_id text not null,
  path text not null,
  path_norm text not null,
  name text not null,
  name_norm text not null,
  parent_path text not null default '',
  parent_path_norm text not null default '',
  ordinal integer not null default 0,
  payload_json text not null default '{}'
);

create table if not exists ascet_folder_items (
  id text primary key,
  run_id text not null,
  folder_path text not null,
  folder_path_norm text not null,
  item_path text not null,
  item_path_norm text not null,
  item_name text not null,
  item_name_norm text not null,
  item_kind text not null default '',
  language_kind text not null default '',
  ordinal integer not null default 0,
  payload_json text not null default '{}'
);

create table if not exists ascet_elements (
  id text primary key,
  run_id text not null,
  owner_path text not null,
  owner_path_norm text not null,
  name text not null,
  name_norm text not null,
  scope text not null default '',
  runtime_type text not null default '',
  group_name text not null default '',
  source_api text not null default 'GetAllModelElements',
  payload_json text not null default '{}'
);

create table if not exists ascet_methods (
  id text primary key,
  run_id text not null,
  owner_path text not null,
  owner_path_norm text not null,
  name text not null,
  name_norm text not null,
  method_kind text not null default '',
  diagram_name text not null default '',
  diagram_kind text not null default '',
  runtime_type text not null default '',
  source_api text not null default '',
  payload_json text not null default '{}'
);

create table if not exists ascet_project_formulas (
  id text primary key,
  run_id text not null,
  project_path text not null,
  project_path_norm text not null,
  name text not null,
  name_norm text not null,
  runtime_type text not null default 'Formula',
  source_api text not null default 'Project.GetAllFormulas',
  payload_json text not null default '{}'
);

create table if not exists ascet_project_items (
  id text primary key,
  run_id text not null,
  project_path text not null,
  project_path_norm text not null,
  name text not null,
  name_norm text not null,
  item_kind text not null,
  runtime_type text not null default '',
  source_api text not null default '',
  payload_json text not null default '{}'
);

create table if not exists ascet_element_refs (
  id text primary key,
  run_id text not null,
  source_component_path text not null,
  source_component_path_norm text not null,
  source_element_name text not null default '',
  source_element_name_norm text not null default '',
  source_element_kind text not null default '',
  source_element_scope text not null default '',
  target_component_path text not null default '',
  target_component_path_norm text not null default '',
  target_component_name text not null default '',
  target_component_name_norm text not null default '',
  target_component_kind text not null default '',
  target_language_kind text not null default '',
  reference_kind text not null default '',
  resolved integer not null default 0,
  payload_json text not null default '{}'
);

create table if not exists ascet_dbitem_dependencies (
  id text primary key,
  run_id text not null,
  source_path text not null,
  source_path_norm text not null,
  target_path text not null,
  target_path_norm text not null,
  target_name text not null default '',
  target_name_norm text not null default '',
  target_kind text not null default '',
  source_api text not null default 'GetAllReferecedDataBaseItems',
  payload_json text not null default '{}'
);

create table if not exists ascet_code_blocks (
  id text primary key,
  run_id text not null,
  owner_path text not null,
  owner_path_norm text not null,
  block_kind text not null,
  block_name text not null default '',
  block_name_norm text not null default '',
  language text not null default '',
  section text not null default '',
  text text not null,
  text_norm text not null default '',
  line_count integer not null default 0,
  char_count integer not null default 0,
  source_api text not null default '',
  payload_json text not null default '{}'
);

create table if not exists ascet_code_terms (
  run_id text not null,
  term_norm text not null,
  block_id text not null,
  positions_json text not null default '[]',
  primary key (run_id, term_norm, block_id)
);

create unique index if not exists idx_active_run on ascet_index_runs(active) where active = 1;
create index if not exists idx_docs_run_kind_name on ascet_search_documents(run_id, kind, name_norm);
create index if not exists idx_docs_run_kind_owner on ascet_search_documents(run_id, kind, owner_path_norm);
create index if not exists idx_docs_run_path on ascet_search_documents(run_id, path_norm);
create index if not exists idx_docs_run_partition on ascet_search_documents(run_id, partition);
create index if not exists idx_components_run_name on ascet_components(run_id, name_norm);
create index if not exists idx_components_run_path on ascet_components(run_id, path_norm);
create index if not exists idx_folders_run_parent_order on ascet_folders(run_id, parent_path_norm, ordinal);
create index if not exists idx_folder_items_run_folder_order on ascet_folder_items(run_id, folder_path_norm, ordinal);
create index if not exists idx_folder_items_run_kind_language on ascet_folder_items(run_id, item_kind, language_kind);
create index if not exists idx_elements_run_name on ascet_elements(run_id, name_norm);
create index if not exists idx_elements_run_owner on ascet_elements(run_id, owner_path_norm);
create index if not exists idx_methods_run_name on ascet_methods(run_id, name_norm);
create index if not exists idx_methods_run_owner on ascet_methods(run_id, owner_path_norm);
create index if not exists idx_formulas_run_name on ascet_project_formulas(run_id, name_norm);
create index if not exists idx_formulas_run_project on ascet_project_formulas(run_id, project_path_norm);
create index if not exists idx_element_refs_target on ascet_element_refs(run_id, target_component_path_norm, target_component_name_norm);
create index if not exists idx_element_refs_source on ascet_element_refs(run_id, source_component_path_norm, source_element_name_norm);
create index if not exists idx_dbitem_deps_target on ascet_dbitem_dependencies(run_id, target_path_norm);
create index if not exists idx_code_terms_term on ascet_code_terms(run_id, term_norm);
create index if not exists idx_code_blocks_owner on ascet_code_blocks(run_id, owner_path_norm);
`;
