# -*- coding: utf-8 -*-
"""Inserts family_defaults blocks. Strength is deliberately soft (typical/weak) so
that a member's own explicit positions always dominate the family's."""
import glob, re, io

D = {}

D['marxist_leninist'] = dict(
 property_regime='state_owned', economic_coordination='central_planning', market_role='abolished',
 class_analysis='central_marxist', state_scope='total', political_pluralism='single_party',
 decision_procedure='vanguard_party', transition_method='insurrection', religion_in_public_life='militantly_secular',
 epistemic_authority='dialectical_materialism', hierarchy_stance='functional_necessary',
 technology_stance='industrial_neutral', utopian_horizon='achievable_new_order',
 violence_legitimacy='insurrectionary', internationalism='proletarian_internationalist',
 vanguard_role='necessary', reform_vs_rupture='rupture', welfare_provision='universal_public',
 education_aim='ideological_formation', work_ethic='work_is_duty', human_nature='historically_produced',
 tradition_stance='reject', gender_order='formal_equality', ecology_priority='managed_externality',
 electoral_participation='tactical', scale_of_polity='national', growth_stance='growth_essential',
 distribution_principle='contribution_labour', firm_form='state_enterprise', healthcare='universal_public',
 housing='social_provision', speech_norms='ideologically_policed', rights_basis='collective_historical',
 urban_rural='urban_industrial', attitude_to_modernity='embrace', organisation_form='vanguard_party',
 land_regime='collectivised', money_form='conventional', wage_labour='regulated', imperialism_analysis='central_frame',
 art_and_culture='propaganda_functional', family_form='egalitarian_nuclear', legitimate_violence='state_monopoly',
 nation_concept='class_based', leadership_form='collective', federalism='unitary', inheritance='abolished')

D['left_communism'] = dict(
 class_analysis='central_marxist', property_regime='communal', economic_coordination='central_planning',
 market_role='abolished', hierarchy_stance='abolish', internationalism='proletarian_internationalist',
 epistemic_authority='dialectical_materialism', reform_vs_rupture='rupture', state_trajectory='wither_away',
 political_pluralism='no_parties_councils', decision_procedure='delegation_recallable',
 religion_in_public_life='militantly_secular', nationalism_stance='hostile', technology_stance='industrial_neutral',
 utopian_horizon='achievable_new_order', human_nature='historically_produced', tradition_stance='reject',
 education_aim='critical_consciousness', urban_rural='urban_industrial', distribution_principle='need',
 wage_labour='abolish_entirely', money_form='abolished', gender_order='formal_equality',
 work_ethic='work_reduced', speech_norms='broadly_free', rights_basis='collective_historical',
 nation_concept='class_based', imperialism_analysis='central_frame', leadership_form='collective',
 scale_of_polity='world_federal', attitude_to_modernity='critical_engagement', inheritance='abolished',
 firm_form='communal_unit', welfare_provision='communal_direct', land_regime='collectivised',
 violence_legitimacy='insurrectionary', family_form='egalitarian_nuclear', borders='abolished')

_anarchist_common = dict(
 state_trajectory='abolish_now', hierarchy_stance='abolish', policing='abolish', punishment='abolitionist',
 electoral_participation='boycott', political_pluralism='no_parties_councils', decision_procedure='direct_democracy',
 leadership_form='none', federalism='none_stateless', legitimate_violence='communal_militia',
 religion_in_public_life='militantly_secular', constitutionalism='no_constitution',
 human_nature='cooperative_good', welfare_provision='mutual_aid', scale_of_polity='village_commune',
 borders='abolished', immigration='open_borders', nationalism_stance='hostile', gender_order='structural_liberation',
 sexuality_stance='liberationist', family_form='egalitarian_nuclear', education_aim='critical_consciousness',
 speech_norms='absolutist', rights_basis='natural_individual', tradition_stance='reject',
 reform_vs_rupture='rupture', vanguard_role='rejected', state_scope='nightwatchman',
 utopian_horizon='achievable_new_order', inheritance='abolished', reproductive_politics='reproductive_freedom',
 healthcare='communal_mutual', housing='occupancy_use', work_ethic='work_reduced',
 property_in_person='self_ownership_absolute', internationalism='proletarian_internationalist')

D['social_anarchism'] = dict(_anarchist_common, property_regime='communal', market_role='abolished',
 money_form='abolished', economic_coordination='moneyless_planning', distribution_principle='need',
 class_analysis='central_marxist', firm_form='communal_unit', wage_labour='abolish_entirely',
 land_regime='commons', organisation_form='federation', technology_stance='appropriate_scale',
 ecology_priority='central_constraint', imperialism_analysis='central_frame')

D['market_anarchism'] = dict(_anarchist_common, property_regime='mutualist_possession', market_role='central',
 money_form='mutual_credit', economic_coordination='market_socialism', distribution_principle='contribution_labour',
 class_analysis='producer_parasite', firm_form='household_artisan', land_regime='tenured_use',
 organisation_form='affinity_group', sovereignty_locus='individual', epistemic_authority='popular_reason',
 secession_right='exit_by_individual', technology_stance='industrial_neutral')

D['anarcho_capitalism'] = dict(
 state_trajectory='replace_with_market', property_regime='private_absolute', market_role='central',
 economic_coordination='free_market', money_form='private_competing', firm_form='investor_owned',
 policing='private', legitimate_violence='competing_providers', welfare_provision='charity_voluntary',
 rights_basis='natural_individual', property_in_person='self_ownership_absolute', sovereignty_locus='individual',
 healthcare='market', housing='market_commodity', inheritance='unrestricted', land_regime='private_absolute',
 distribution_principle='desert_market', state_scope='nightwatchman', hierarchy_stance='functional_necessary',
 human_nature='self_interested_rational', epistemic_authority='market_aggregation', electoral_participation='boycott',
 secession_right='exit_by_individual', decision_procedure='market_signal', wage_labour='legitimate',
 class_analysis='rejected', ecology_priority='managed_externality', speech_norms='absolutist',
 punishment='deterrent_proportional', education_aim='individual_flourishing', work_ethic='work_is_virtue',
 growth_stance='growth_essential', technology_stance='accelerate', political_pluralism='no_parties_traditional',
 utopian_horizon='none_pragmatic', constitutionalism='no_constitution', nation_concept='post_national',
 transition_method='exit_secession', reproductive_politics='reproductive_freedom', federalism='confederal')

D['liberalism'] = dict(
 market_role='central', economic_coordination='regulated_market', property_regime='private_regulated',
 political_pluralism='multiparty', decision_procedure='representative_election', constitutionalism='entrenched_rights',
 rights_basis='natural_individual', speech_norms='broadly_free', religion_in_public_life='secular_neutral',
 transition_method='gradual_reform', reform_vs_rupture='reform', state_scope='limited',
 hierarchy_stance='functional_necessary', tradition_stance='critically_inherit', class_analysis='rejected',
 utopian_horizon='gradual_improvement', electoral_participation='central', legitimate_violence='state_monopoly',
 policing='professional', punishment='deterrent_proportional', gender_order='formal_equality',
 sexuality_stance='tolerant_private', family_form='egalitarian_nuclear', education_aim='individual_flourishing',
 firm_form='investor_owned', money_form='conventional', wage_labour='legitimate', borders='open',
 immigration='welcome', internationalism='cosmopolitan_universal', nation_concept='civic',
 nationalism_stance='indifferent', epistemic_authority='popular_reason', human_nature='self_interested_rational',
 technology_stance='industrial_neutral', growth_stance='growth_essential', attitude_to_modernity='embrace',
 property_in_person='self_ownership_absolute', land_regime='private_absolute', urban_rural='urban_industrial',
 federalism='federal', leadership_form='collective', organisation_form='mass_party', work_ethic='work_is_virtue',
 art_and_culture='commercial_free', reproductive_politics='reproductive_freedom', sphere_separation='church_state_separate')

D['social_democracy'] = dict(
 economic_coordination='mixed_economy', market_role='retained_bounded', welfare_provision='universal_public',
 state_scope='welfare_broad', transition_method='electoral', electoral_participation='central',
 political_pluralism='multiparty', reform_vs_rupture='reform', healthcare='universal_public',
 housing='social_provision', organisation_form='mass_party', class_analysis='central_marxist',
 inheritance='taxed', distribution_principle='subsistence_guarantee', decision_procedure='representative_election',
 constitutionalism='entrenched_rights', rights_basis='positive_legal', speech_norms='broadly_free',
 religion_in_public_life='secular_neutral', gender_order='formal_equality', sexuality_stance='tolerant_private',
 family_form='egalitarian_nuclear', education_aim='civic_formation', immigration='welcome',
 internationalism='cosmopolitan_universal', nationalism_stance='indifferent', hierarchy_stance='minimise',
 technology_stance='industrial_neutral', growth_stance='growth_managed', ecology_priority='central_constraint',
 human_nature='cooperative_good', utopian_horizon='gradual_improvement', attitude_to_modernity='embrace',
 firm_form='investor_owned', wage_labour='regulated', property_regime='private_regulated',
 money_form='conventional', punishment='rehabilitative', policing='professional', urban_rural='balanced',
 legitimate_violence='state_monopoly', violence_legitimacy='never', vanguard_role='rejected',
 scale_of_polity='national', leadership_form='collective', work_ethic='work_is_duty', tradition_stance='critically_inherit')

D['georgism'] = dict(
 land_regime='private_taxed_rent', market_role='central', economic_coordination='regulated_market',
 class_analysis='producer_parasite', transition_method='electoral', electoral_participation='central',
 state_scope='limited', basic_income='social_dividend', property_regime='private_regulated',
 borders='open', immigration='open_borders', rights_basis='natural_individual', reform_vs_rupture='reform',
 political_pluralism='multiparty', decision_procedure='representative_election', firm_form='investor_owned',
 money_form='conventional', distribution_principle='desert_market', religion_in_public_life='secular_neutral',
 hierarchy_stance='minimise', epistemic_authority='popular_reason', utopian_horizon='achievable_new_order',
 technology_stance='industrial_neutral', urban_rural='urban_industrial', wage_labour='legitimate',
 human_nature='self_interested_rational', internationalism='cosmopolitan_universal', speech_norms='broadly_free',
 growth_stance='growth_managed', welfare_provision='insurance_contributory', housing='market_commodity',
 attitude_to_modernity='embrace', tradition_stance='critically_inherit', gender_order='formal_equality')

D['monetary_heterodoxy'] = dict(
 class_analysis='producer_parasite', market_role='central', economic_coordination='regulated_market',
 transition_method='electoral', electoral_participation='central', property_regime='private_regulated',
 state_scope='limited', reform_vs_rupture='reform', political_pluralism='multiparty',
 decision_procedure='representative_election', distribution_principle='subsistence_guarantee',
 epistemic_authority='scientific_expertise', hierarchy_stance='minimise', utopian_horizon='achievable_new_order',
 firm_form='household_artisan', religion_in_public_life='secular_neutral', wage_labour='regulated',
 technology_stance='industrial_neutral', urban_rural='balanced', human_nature='self_interested_rational',
 welfare_provision='universal_public', land_regime='private_regulated', speech_norms='broadly_free',
 attitude_to_modernity='embrace', gender_order='formal_equality', scale_of_polity='national',
 nationalism_stance='indifferent', growth_stance='growth_managed', tradition_stance='critically_inherit')

D['cooperativism'] = dict(
 firm_form='worker_cooperative', property_regime='cooperative', wage_labour='abolish_via_coops',
 decision_procedure='direct_democracy', hierarchy_stance='minimise', class_analysis='central_marxist',
 organisation_form='union', transition_method='prefigurative', economic_coordination='market_socialism',
 market_role='retained_bounded', distribution_principle='contribution_labour', state_scope='limited',
 work_ethic='work_is_virtue', welfare_provision='mutual_aid', leadership_form='rotating_delegates',
 scale_of_polity='village_commune', federalism='confederal', education_aim='technical_capacity',
 human_nature='cooperative_good', money_form='mutual_credit', technology_stance='appropriate_scale',
 utopian_horizon='achievable_new_order', gender_order='formal_equality', tradition_stance='critically_inherit',
 political_pluralism='no_parties_councils', reform_vs_rupture='reform_toward_rupture', housing='decommodified_commons',
 land_regime='commons', ecology_priority='central_constraint', urban_rural='balanced', speech_norms='broadly_free')

D['religious_social'] = dict(
 religion_in_public_life='culturally_grounded', rights_basis='divine_law', epistemic_authority='revelation',
 sovereignty_locus='divine', property_in_person='divine_stewardship', welfare_provision='charity_voluntary',
 distribution_principle='need', hierarchy_stance='functional_necessary', family_form='nuclear_traditional',
 human_nature='fallen_needs_restraint', tradition_stance='critically_inherit', violence_legitimacy='never',
 organisation_form='church_movement', transition_method='gradual_reform', economic_coordination='mixed_economy',
 market_role='retained_bounded', property_regime='distributed_wide', scale_of_polity='village_commune',
 state_scope='limited', technology_stance='appropriate_scale', growth_stance='steady_state',
 education_aim='transmit_tradition', work_ethic='work_is_virtue', punishment='restorative',
 utopian_horizon='transcendent_eschaton', firm_form='household_artisan', urban_rural='agrarian_rural',
 class_analysis='status_group', attitude_to_modernity='critical_engagement', decision_procedure='consensus',
 political_pluralism='multiparty', sexuality_stance='traditional_restrictive', gender_order='traditional_complementary',
 wage_labour='regulated', inheritance='unrestricted', nonhuman_status='welfare_regulated')

D['integralism'] = dict(
 religion_in_public_life='theocratic', rights_basis='divine_law', sovereignty_locus='divine',
 epistemic_authority='revelation', decision_procedure='clerical_authority', sphere_separation='unified_state',
 tradition_stance='restore', family_form='patriarchal_household', sexuality_stance='traditional_restrictive',
 gender_order='traditional_complementary', speech_norms='traditional_blasphemy_limits',
 hierarchy_stance='natural_good', education_aim='transmit_tradition', attitude_to_modernity='reject_return',
 political_pluralism='no_parties_traditional', punishment='retributive_harsh', human_nature='fallen_needs_restraint',
 nation_concept='religious', utopian_horizon='restorationist_golden_age', reproductive_politics='natalist_restrictive',
 art_and_culture='preserve_canon', class_analysis='status_group', state_scope='developmental',
 economic_coordination='regulated_market', market_role='retained_bounded', property_regime='private_regulated',
 welfare_provision='charity_voluntary', transition_method='cultural_metapolitics', immigration='restrict_sharply',
 borders='closed', constitutionalism='divine_law', property_in_person='divine_stewardship',
 technology_stance='industrial_neutral', urban_rural='balanced', work_ethic='work_is_duty',
 leadership_form='charismatic_leader', organisation_form='church_movement', inheritance='unrestricted')

D['conservatism'] = dict(
 tradition_stance='conserve', epistemic_authority='tradition', human_nature='fallen_needs_restraint',
 hierarchy_stance='functional_necessary', transition_method='gradual_reform', reform_vs_rupture='reform',
 utopian_horizon='none_pragmatic', family_form='nuclear_traditional', religion_in_public_life='established_church',
 property_regime='private_regulated', market_role='central', economic_coordination='regulated_market',
 education_aim='transmit_tradition', art_and_culture='preserve_canon', punishment='retributive_harsh',
 policing='professional', legitimate_violence='state_monopoly', immigration='restrict_sharply',
 nationalism_stance='core_value', nation_concept='cultural_linguistic', sexuality_stance='traditional_restrictive',
 gender_order='traditional_complementary', class_analysis='status_group', welfare_provision='charity_voluntary',
 inheritance='unrestricted', land_regime='private_absolute', decision_procedure='representative_election',
 political_pluralism='multiparty', constitutionalism='parliamentary_supremacy', rights_basis='collective_historical',
 speech_norms='broadly_free', internationalism='national_interest', borders='closed',
 attitude_to_modernity='critical_engagement', technology_stance='industrial_neutral', growth_stance='growth_managed',
 electoral_participation='central', state_scope='limited', scale_of_polity='national', firm_form='investor_owned',
 work_ethic='work_is_virtue', urban_rural='balanced', wage_labour='legitimate', ecology_priority='managed_externality')

D['radical_traditionalism'] = dict(
 tradition_stance='restore', attitude_to_modernity='reject_return', hierarchy_stance='natural_good',
 utopian_horizon='restorationist_golden_age', nation_concept='ethnic', nationalism_stance='core_value',
 immigration='restrict_sharply', borders='closed', transition_method='cultural_metapolitics',
 epistemic_authority='esoteric_initiation', gender_order='traditional_complementary',
 family_form='patriarchal_household', sexuality_stance='traditional_restrictive', race_politics='separatism',
 political_pluralism='no_parties_traditional', electoral_participation='boycott', class_analysis='elite_mass',
 education_aim='transmit_tradition', art_and_culture='preserve_canon', human_nature='fallen_needs_restraint',
 religion_in_public_life='spiritual_syncretic', internationalism='isolationist', punishment='retributive_harsh',
 economic_coordination='mixed_economy', market_role='retained_bounded', property_regime='distributed_wide',
 rights_basis='collective_historical', speech_norms='restricted_for_harm', reform_vs_rupture='rupture',
 scale_of_polity='regional', ecology_priority='central_constraint', technology_stance='industrial_neutral',
 leadership_form='charismatic_leader', organisation_form='network', state_scope='developmental',
 reproductive_politics='natalist_restrictive', urban_rural='agrarian_rural', welfare_provision='communal_direct')

D['fascism'] = dict(
 state_scope='total', leadership_form='charismatic_leader', political_pluralism='single_party',
 hierarchy_stance='natural_good', nationalism_stance='core_value', nation_concept='ethnic',
 violence_legitimacy='total_war', class_analysis='rejected', speech_norms='ideologically_policed',
 art_and_culture='propaganda_functional', sovereignty_locus='nation', tradition_stance='restore',
 gender_order='traditional_complementary', family_form='patriarchal_household', reproductive_politics='natalist_restrictive',
 immigration='restrict_sharply', borders='closed', firm_form='guild', economic_coordination='indicative_planning',
 market_role='retained_bounded', property_regime='private_regulated', education_aim='ideological_formation',
 legitimate_violence='state_monopoly', punishment='retributive_harsh', policing='professional',
 rights_basis='none_power', decision_procedure='vanguard_party', electoral_participation='tactical',
 transition_method='coup_vanguard', internationalism='national_interest', religion_in_public_life='culturally_grounded',
 human_nature='fallen_needs_restraint', epistemic_authority='tradition', constitutionalism='revolutionary_legality',
 utopian_horizon='restorationist_golden_age', attitude_to_modernity='transcend_forward', scale_of_polity='national',
 federalism='unitary', welfare_provision='universal_public', work_ethic='work_is_duty',
 technology_stance='industrial_neutral', growth_stance='growth_essential', sexuality_stance='traditional_restrictive',
 urban_rural='balanced', organisation_form='mass_party', secession_right='none', wage_labour='regulated',
 race_politics='hierarchy_asserted', colonialism_stance='justified')

D['nationalism'] = dict(
 nationalism_stance='core_value', sovereignty_locus='nation', scale_of_polity='national',
 language_politics='national_language', education_aim='civic_formation', electoral_participation='central',
 transition_method='electoral', state_scope='developmental', legitimate_violence='state_monopoly',
 political_pluralism='multiparty', internationalism='national_interest', tradition_stance='conserve',
 economic_coordination='mixed_economy', market_role='retained_bounded', property_regime='private_regulated',
 art_and_culture='popular_folk', class_analysis='status_group', utopian_horizon='achievable_new_order',
 human_nature='historically_produced', welfare_provision='universal_public', decision_procedure='representative_election')

D['populism'] = dict(
 class_analysis='elite_mass', decision_procedure='direct_democracy', epistemic_authority='popular_reason',
 electoral_participation='central', transition_method='electoral', leadership_form='charismatic_leader',
 welfare_provision='universal_public', economic_coordination='mixed_economy', market_role='retained_bounded',
 political_pluralism='multiparty', state_scope='welfare_broad', property_regime='distributed_wide',
 utopian_horizon='achievable_new_order', hierarchy_stance='minimise', organisation_form='mass_party',
 sovereignty_locus='community', speech_norms='broadly_free', tradition_stance='conserve',
 education_aim='civic_formation', urban_rural='balanced', work_ethic='work_is_virtue',
 firm_form='household_artisan', human_nature='cooperative_good', technology_stance='industrial_neutral',
 money_form='sovereign_fiat_expansive', reform_vs_rupture='reform', constitutionalism='parliamentary_supremacy')

D['green'] = dict(
 ecology_priority='primary_frame', nonhuman_status='rights_bearing', growth_stance='degrowth',
 technology_stance='appropriate_scale', scale_of_polity='bioregional', decision_procedure='direct_democracy',
 hierarchy_stance='minimise', urban_rural='balanced', economic_coordination='regulated_market',
 market_role='retained_bounded', welfare_provision='universal_public', transition_method='prefigurative',
 electoral_participation='central', political_pluralism='multiparty', violence_legitimacy='never',
 human_nature='cooperative_good', distribution_principle='need', education_aim='critical_consciousness',
 federalism='confederal', land_regime='commons', property_regime='cooperative', firm_form='worker_cooperative',
 gender_order='structural_liberation', immigration='welcome', internationalism='cosmopolitan_universal',
 work_ethic='work_reduced', housing='decommodified_commons', healthcare='universal_public',
 epistemic_authority='scientific_expertise', utopian_horizon='achievable_new_order', punishment='restorative',
 attitude_to_modernity='critical_engagement', tradition_stance='critically_inherit', speech_norms='broadly_free',
 class_analysis='central_marxist', reform_vs_rupture='reform_toward_rupture', basic_income='support_ubi')

D['primitivism'] = dict(
 technology_stance='primitivist_reject', attitude_to_modernity='reject_return', ecology_priority='primary_frame',
 growth_stance='degrowth', urban_rural='back_to_land', scale_of_polity='village_commune',
 state_trajectory='abolish_now', hierarchy_stance='abolish', nonhuman_status='sacred',
 work_ethic='work_abolished', utopian_horizon='restorationist_golden_age', market_role='abolished',
 money_form='abolished', electoral_participation='boycott', organisation_form='affinity_group',
 education_aim='individual_flourishing', decision_procedure='consensus', property_regime='communal',
 land_regime='commons', economic_coordination='moneyless_planning', welfare_provision='mutual_aid',
 leadership_form='none', reform_vs_rupture='rupture', policing='abolish', punishment='abolitionist',
 human_nature='cooperative_good', epistemic_authority='popular_reason', class_analysis='rejected',
 distribution_principle='need', religion_in_public_life='spiritual_syncretic', healthcare='communal_mutual',
 speech_norms='absolutist', family_form='communal_rearing', firm_form='household_artisan', vanguard_role='rejected')

D['technocracy'] = dict(
 decision_procedure='expert_rule', epistemic_authority='scientific_expertise', leadership_form='technocratic_board',
 education_aim='technical_capacity', economic_coordination='indicative_planning', property_regime='state_owned',
 market_role='transitional', political_pluralism='no_parties_traditional', hierarchy_stance='functional_necessary',
 technology_stance='accelerate', state_scope='developmental', attitude_to_modernity='embrace',
 distribution_principle='need', class_analysis='rejected', firm_form='state_enterprise',
 utopian_horizon='achievable_new_order', human_nature='historically_produced', work_ethic='work_reduced',
 welfare_provision='universal_public', healthcare='universal_public', religion_in_public_life='militantly_secular',
 tradition_stance='reject', transition_method='gradual_reform', growth_stance='growth_managed',
 urban_rural='urban_industrial', scale_of_polity='continental_bloc', money_form='abolished',
 electoral_participation='tactical', speech_norms='broadly_free', gender_order='formal_equality',
 art_and_culture='commercial_free', housing='social_provision', land_regime='state_owned')

D['accelerationism'] = dict(
 technology_stance='accelerate', attitude_to_modernity='transcend_forward', growth_stance='growth_essential',
 epistemic_authority='scientific_expertise', space_expansion='human_destiny', human_nature='perfectible',
 death_and_finitude='defeat_technologically', utopian_horizon='achievable_new_order',
 transition_method='cultural_metapolitics', tradition_stance='reject', work_ethic='work_abolished',
 religion_in_public_life='militantly_secular', education_aim='technical_capacity', urban_rural='urban_industrial',
 reproductive_politics='reproductive_freedom', sexuality_stance='liberationist', gender_order='formal_equality',
 ecology_priority='managed_externality', nonhuman_status='resource', scale_of_polity='world_federal',
 hierarchy_stance='minimise', property_in_person='self_ownership_absolute', market_role='central',
 economic_coordination='regulated_market', nationalism_stance='hostile', borders='open',
 art_and_culture='avant_garde_rupture', class_analysis='rejected', family_form='egalitarian_nuclear',
 state_scope='limited', political_pluralism='multiparty', speech_norms='broadly_free', healthcare='market')

D['feminism'] = dict(
 gender_order='structural_liberation', reproductive_politics='reproductive_freedom',
 domestic_labour='waged_socialised', family_form='egalitarian_nuclear', hierarchy_stance='abolish',
 class_analysis='status_group', education_aim='critical_consciousness', sexuality_stance='liberationist',
 human_nature='historically_produced', welfare_provision='universal_public', healthcare='universal_public',
 transition_method='prefigurative', electoral_participation='central', political_pluralism='multiparty',
 epistemic_authority='popular_reason', tradition_stance='reject', religion_in_public_life='secular_neutral',
 punishment='restorative', policing='community_controlled', speech_norms='restricted_for_harm',
 attitude_to_modernity='critical_engagement', utopian_horizon='achievable_new_order',
 economic_coordination='mixed_economy', market_role='retained_bounded', state_scope='welfare_broad',
 organisation_form='affinity_group', immigration='welcome', race_politics='antiracist_structural',
 colonialism_stance='oppose', property_regime='cooperative', work_ethic='work_reduced',
 decision_procedure='consensus', leadership_form='collective', rights_basis='positive_legal',
 nonhuman_status='rights_bearing', ecology_priority='central_constraint', housing='social_provision')

D['liberation'] = dict(
 colonialism_stance='reparative_decolonial', education_aim='critical_consciousness',
 race_politics='antiracist_structural', class_analysis='status_group', hierarchy_stance='abolish',
 rights_basis='collective_historical', punishment='abolitionist', policing='community_controlled',
 welfare_provision='communal_direct', imperialism_analysis='central_frame', human_nature='historically_produced',
 tradition_stance='critically_inherit', transition_method='prefigurative', organisation_form='movement_of_movements',
 decision_procedure='direct_democracy', scale_of_polity='municipal_confederal', healthcare='universal_public',
 sexuality_stance='liberationist', gender_order='structural_liberation', speech_norms='restricted_for_harm',
 electoral_participation='tactical', political_pluralism='multiparty', economic_coordination='mixed_economy',
 market_role='retained_bounded', property_regime='cooperative', state_scope='welfare_broad',
 utopian_horizon='achievable_new_order', reform_vs_rupture='rupture', immigration='welcome',
 attitude_to_modernity='critical_engagement', housing='decommodified_commons', land_regime='commons',
 leadership_form='collective', epistemic_authority='popular_reason', nonhuman_status='rights_bearing',
 religion_in_public_life='spiritual_syncretic', work_ethic='work_reduced')

D['globalism'] = dict(
 internationalism='cosmopolitan_universal', borders='open', immigration='open_borders',
 nationalism_stance='hostile', nation_concept='post_national', scale_of_polity='world_federal',
 federalism='federal', constitutionalism='entrenched_rights', rights_basis='natural_individual',
 decision_procedure='representative_election', political_pluralism='multiparty', violence_legitimacy='never',
 transition_method='gradual_reform', reform_vs_rupture='reform', religion_in_public_life='secular_neutral',
 education_aim='civic_formation', epistemic_authority='scientific_expertise', market_role='central',
 economic_coordination='regulated_market', distribution_principle='need', state_scope='welfare_broad',
 hierarchy_stance='minimise', utopian_horizon='gradual_improvement', human_nature='cooperative_good',
 language_politics='multilingual_neutral', technology_stance='industrial_neutral', attitude_to_modernity='embrace',
 tradition_stance='critically_inherit', speech_norms='broadly_free', gender_order='formal_equality',
 secession_right='universal_right', legitimate_violence='state_monopoly', class_analysis='rejected')

D['localism'] = dict(
 scale_of_polity='village_commune', sovereignty_locus='community', federalism='confederal',
 welfare_provision='mutual_aid', technology_stance='appropriate_scale', decision_procedure='consensus',
 growth_stance='steady_state', urban_rural='agrarian_rural', transition_method='prefigurative',
 state_scope='limited', rights_basis='collective_historical', education_aim='civic_formation',
 tradition_stance='conserve', human_nature='cooperative_good', property_regime='distributed_wide',
 market_role='retained_bounded', economic_coordination='mixed_economy', firm_form='household_artisan',
 hierarchy_stance='minimise', land_regime='commons', ecology_priority='central_constraint',
 leadership_form='rotating_delegates', political_pluralism='no_parties_councils', punishment='restorative',
 religion_in_public_life='culturally_grounded', family_form='nuclear_traditional', work_ethic='work_is_virtue',
 money_form='mutual_credit', utopian_horizon='none_pragmatic', attitude_to_modernity='critical_engagement',
 distribution_principle='need', class_analysis='rejected', housing='decommodified_commons', violence_legitimacy='never')

D['centrism'] = dict(
 class_analysis='rejected', utopian_horizon='gradual_improvement', transition_method='gradual_reform',
 reform_vs_rupture='reform', economic_coordination='regulated_market', market_role='central',
 political_pluralism='multiparty', electoral_participation='central', decision_procedure='representative_election',
 state_scope='welfare_broad', welfare_provision='insurance_contributory', epistemic_authority='scientific_expertise',
 constitutionalism='entrenched_rights', rights_basis='positive_legal', speech_norms='broadly_free',
 religion_in_public_life='secular_neutral', hierarchy_stance='functional_necessary', property_regime='private_regulated',
 firm_form='investor_owned', immigration='manage', internationalism='cosmopolitan_universal',
 nationalism_stance='indifferent', tradition_stance='critically_inherit', human_nature='self_interested_rational',
 gender_order='formal_equality', sexuality_stance='tolerant_private', family_form='egalitarian_nuclear',
 education_aim='technical_capacity', technology_stance='industrial_neutral', growth_stance='growth_managed',
 ecology_priority='managed_externality', healthcare='insurance_mandated', housing='market_commodity',
 punishment='deterrent_proportional', work_ethic='work_is_duty', wage_labour='regulated', urban_rural='urban_industrial',
 attitude_to_modernity='embrace', leadership_form='technocratic_board', scale_of_polity='national', inheritance='taxed')

D['post_left'] = dict(
 utopian_horizon='none_pragmatic', organisation_form='none', electoral_participation='boycott',
 rights_basis='none_power', hierarchy_stance='abolish', state_trajectory='abolish_now',
 work_ethic='work_abolished', tradition_stance='reject', vanguard_role='rejected', leadership_form='none',
 transition_method='withdrawal', class_analysis='rejected', speech_norms='absolutist',
 religion_in_public_life='militantly_secular', education_aim='individual_flourishing',
 human_nature='historically_produced', sovereignty_locus='individual', political_pluralism='no_parties_councils',
 art_and_culture='avant_garde_rupture', market_role='abolished', money_form='abolished',
 property_regime='communal', decision_procedure='consensus', policing='abolish', punishment='abolitionist',
 attitude_to_modernity='critical_engagement', scale_of_polity='village_commune', reform_vs_rupture='rupture',
 sexuality_stance='liberationist', family_form='abolish_family', welfare_provision='mutual_aid',
 technology_stance='industrial_neutral', epistemic_authority='popular_reason', nationalism_stance='hostile')

D['utopian_socialism'] = dict(
 transition_method='prefigurative', scale_of_polity='village_commune', property_regime='cooperative',
 utopian_horizon='achievable_new_order', violence_legitimacy='never', human_nature='cooperative_good',
 distribution_principle='need', education_aim='individual_flourishing', decision_procedure='direct_democracy',
 hierarchy_stance='minimise', work_ethic='work_is_virtue', firm_form='worker_cooperative',
 market_role='retained_bounded', economic_coordination='mixed_economy', money_form='mutual_credit',
 welfare_provision='communal_direct', urban_rural='balanced', class_analysis='producer_parasite',
 family_form='communal_rearing', religion_in_public_life='spiritual_syncretic', technology_stance='appropriate_scale',
 attitude_to_modernity='critical_engagement', gender_order='formal_equality', land_regime='commons',
 leadership_form='collective', political_pluralism='no_parties_councils', tradition_stance='reject',
 state_scope='limited', housing='decommodified_commons', reform_vs_rupture='reform_toward_rupture',
 growth_stance='steady_state', epistemic_authority='popular_reason', wage_labour='abolish_via_coops')

D['democratic_form'] = dict(
 decision_procedure='direct_democracy', political_pluralism='multiparty', hierarchy_stance='minimise',
 constitutionalism='entrenched_rights', education_aim='civic_formation', epistemic_authority='popular_reason',
 transition_method='gradual_reform', reform_vs_rupture='reform', leadership_form='rotating_delegates',
 rights_basis='positive_legal', speech_norms='broadly_free', religion_in_public_life='secular_neutral',
 economic_coordination='mixed_economy', market_role='retained_bounded', state_scope='welfare_broad',
 class_analysis='rejected', utopian_horizon='gradual_improvement', scale_of_polity='national',
 nationalism_stance='indifferent', human_nature='cooperative_good', technology_stance='industrial_neutral',
 electoral_participation='central', federalism='federal', tradition_stance='critically_inherit',
 attitude_to_modernity='embrace', gender_order='formal_equality', welfare_provision='universal_public')

D['esoteric_fringe'] = dict(
 epistemic_authority='esoteric_initiation', religion_in_public_life='spiritual_syncretic',
 utopian_horizon='transcendent_eschaton', electoral_participation='boycott',
 attitude_to_modernity='reject_return', tradition_stance='restore', organisation_form='church_movement',
 human_nature='perfectible', transition_method='withdrawal', scale_of_polity='village_commune',
 education_aim='ideological_formation', leadership_form='charismatic_leader', hierarchy_stance='natural_good')

# ---- insert into files ----
files = {}
for path in glob.glob('kb/ideologies/*.yaml'):
    text = open(path, encoding='utf-8').read()
    fam = re.search(r'^family:\s*(\S+)', text, re.M).group(1)
    if fam not in D:
        print('NO DEFAULTS for', fam); continue
    if 'family_defaults:' in text:
        text = re.sub(r'family_defaults:\n(?:  \S+:.*\n)+', '', text)
    block = 'family_defaults:\n' + ''.join(
        '  %s: [%s, typical]\n' % (t, v) for t, v in sorted(D[fam].items()))
    text = re.sub(r'^(label:.*\n)', r'\1' + block.replace('\\', '\\\\'), text, count=1, flags=re.M)
    open(path, 'w', encoding='utf-8').write(text)
    files[fam] = len(D[fam])

for f, n in sorted(files.items()):
    print(f'{n:3d}  {f}')
print('total default assertions:', sum(files.values()))
