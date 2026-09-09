# -*- coding: utf-8 -*-
"""Adds explicit discriminating positions to entries the confusability check flagged
as collapsing into their family defaults."""
import glob, re

ADD = {
 'world_federalism': [('legitimate_violence','state_monopoly','core'),('constitutionalism','entrenched_rights','core'),('state_scope','welfare_broad','strong'),('decision_procedure','representative_election','core')],
 'cosmopolitanism': [('sovereignty_locus','humanity','core'),('distribution_principle','need','core'),('rights_basis','natural_individual','core'),('scale_of_polity','national','weak'),('transition_method','cultural_metapolitics','strong')],
 'democratic_globalism': [('electoral_participation','central','core'),('political_pluralism','multiparty','core'),('decision_procedure','representative_election','core'),('federalism','federal','core')],
 'open_borders_maximalism': [('borders','abolished','core'),('immigration','open_borders','core'),('market_role','central','strong'),('state_scope','limited','strong'),('welfare_provision','insurance_contributory','typical')],
 'third_way': [('work_ethic','work_is_duty','core'),('welfare_provision','insurance_contributory','core'),('market_role','central','core'),('punishment','deterrent_proportional','strong')],
 'technocratic_centrism': [('decision_procedure','expert_rule','core'),('leadership_form','technocratic_board','core'),('epistemic_authority','scientific_expertise','core'),('political_pluralism','no_parties_traditional','typical')],
 'radical_centrism': [('epistemic_authority','scientific_expertise','core'),('basic_income','support_ubi','strong'),('political_pluralism','multiparty','core'),('utopian_horizon','gradual_improvement','core')],
 'transhumanism': [('property_in_person','self_ownership_absolute','core'),('human_nature','perfectible','core'),('healthcare','market','strong'),('space_expansion','irrelevant','weak')],
 'immortalism': [('death_and_finitude','defeat_technologically','core'),('healthcare','market','core'),('space_expansion','irrelevant','typical'),('growth_stance','growth_essential','strong')],
 'space_expansionism': [('space_expansion','human_destiny','core'),('death_and_finitude','accept_natural','typical'),('ecology_priority','managed_externality','strong'),('scale_of_polity','world_federal','strong')],
 'technogaianism': [('ecology_priority','primary_frame','core'),('technology_stance','transhuman','core'),('nonhuman_status','rights_bearing','strong'),('growth_stance','growth_managed','strong')],
 'lunarpunk': [('speech_norms','absolutist','core'),('money_form','private_competing','core'),('organisation_form','network','core'),('state_trajectory','abolish_now','strong')],
 'radical_feminism': [('class_analysis','status_group','core'),('speech_norms','restricted_for_harm','strong'),('sexuality_stance','liberationist','typical'),('gender_order','structural_liberation','core')],
 'materialist_feminism': [('gender_order','abolish_gender','core'),('domestic_labour','waged_socialised','core'),('human_nature','historically_produced','core'),('sexuality_stance','queer_abolitionist','strong')],
 'worker_self_directed_enterprise': [('class_analysis','central_marxist','core'),('firm_form','worker_cooperative','core'),('market_role','retained_bounded','strong'),('scale_of_polity','national','typical')],
 'solidarity_economy': [('money_form','mutual_credit','strong'),('scale_of_polity','municipal_confederal','core'),('welfare_provision','mutual_aid','core'),('ecology_priority','central_constraint','strong')],
 'mutual_banking': [('money_form','mutual_credit','core'),('market_role','central','core'),('class_analysis','producer_parasite','core'),('state_trajectory','minimal','strong')],
 'right_populism': [('immigration','restrict_sharply','core'),('nationalism_stance','core_value','core'),('internationalism','isolationist','core'),('tradition_stance','restore','strong'),('nation_concept','ethnic','strong')],
 'left_populism': [('immigration','welcome','strong'),('nationalism_stance','indifferent','strong'),('welfare_provision','universal_public','core'),('class_analysis','elite_mass','core'),('nation_concept','civic','typical')],
 'us_peoples_party': [('money_form','sovereign_fiat_expansive','core'),('property_regime','state_owned','strong'),('urban_rural','agrarian_rural','core'),('decision_procedure','direct_democracy','strong')],
 'commons_trusteeship': [('land_regime','commons','core'),('basic_income','social_dividend','core'),('distribution_principle','equal_share','core'),('market_role','retained_bounded','strong')],
 'minjung_theology': [('class_analysis','elite_mass','core'),('nationalism_stance','instrumental_for_liberation','core'),('colonialism_stance','reparative_decolonial','core'),('education_aim','critical_consciousness','core')],
 'rexism': [('leadership_form','charismatic_leader','core'),('religion_in_public_life','established_church','core'),('state_scope','total','core'),('political_pluralism','single_party','core'),('class_analysis','elite_mass','core')],
 'black_panther_marxism': [('legitimate_violence','communal_militia','core'),('policing','community_controlled','core'),('race_politics','liberationist_nationalist','core'),('welfare_provision','communal_direct','core')],
 'negritude': [('art_and_culture','popular_folk','core'),('nation_concept','diasporic','core'),('tradition_stance','critically_inherit','core'),('transition_method','cultural_metapolitics','core')],
 'nkrumaism': [('scale_of_polity','continental_bloc','core'),('federalism','federal','core'),('state_scope','developmental','core'),('economic_coordination','indicative_planning','strong')],
 'parish_localism': [('religion_in_public_life','established_church','core'),('welfare_provision','charity_voluntary','core'),('tradition_stance','conserve','core'),('scale_of_polity','village_commune','core')],
 'agrarianism': [('urban_rural','agrarian_rural','core'),('property_regime','distributed_wide','core'),('work_ethic','work_is_virtue','core'),('religion_in_public_life','culturally_grounded','typical')],
 'dunbar_politics': [('hierarchy_stance','minimise','core'),('decision_procedure','direct_democracy','core'),('federalism','confederal','core'),('epistemic_authority','popular_reason','core')],
 'neo_tribalism': [('tradition_stance','restore','core'),('organisation_form','affinity_group','core'),('urban_rural','back_to_land','core'),('human_nature','historically_produced','strong')],
 'individualist_nihilism': [('utopian_horizon','none_pragmatic','core'),('organisation_form','none','core'),('human_nature','self_interested_rational','strong'),('transition_method','withdrawal','strong')],
 'egoism': [('rights_basis','none_power','core'),('organisation_form','affinity_group','core'),('sovereignty_locus','individual','core'),('tradition_stance','reject','core')],
 'freeman_on_the_land': [('constitutionalism','no_constitution','core'),('rights_basis','natural_individual','core'),('secession_right','exit_by_individual','core'),('religion_in_public_life','secular_neutral','typical')],
 'rastafari_politics': [('nation_concept','diasporic','core'),('race_politics','liberationist_nationalist','core'),('urban_rural','back_to_land','core'),('nonhuman_status','sacred','core')],
 'syncretic_esoteric_nationalism': [('nationalism_stance','core_value','core'),('nation_concept','ethnic','core'),('transition_method','cultural_metapolitics','core'),('art_and_culture','popular_folk','strong')],
 'larouchism': [('economic_coordination','indicative_planning','core'),('technology_stance','accelerate','core'),('space_expansion','human_destiny','core'),('money_form','sovereign_fiat_expansive','core'),('growth_stance','growth_essential','core')],
 'ho_chi_minh_thought': [('nationalism_stance','instrumental_for_liberation','core'),('colonialism_stance','reparative_decolonial','core'),('transition_method','protracted_peoples_war','core'),('internationalism','anti_imperialist_nationalist','core')],
 'kimilsungism_kimjongilism': [('leadership_form','hereditary','core'),('internationalism','isolationist','core'),('borders','closed','core'),('epistemic_authority','revelation','strong')],
 'trotskyism': [('internationalism','proletarian_internationalist','core'),('organisation_form','vanguard_party','core'),('political_pluralism','no_parties_councils','strong'),('speech_norms','broadly_free','typical')],
 'pabloism': [('organisation_form','mass_party','core'),('transition_method','gradual_reform','core'),('electoral_participation','tactical','core'),('reform_vs_rupture','reform_toward_rupture','core')],
 'council_communism': [('political_pluralism','no_parties_councils','core'),('vanguard_role','rejected','core'),('electoral_participation','boycott','core'),('transition_method','general_strike','core')],
 'especifismo': [('organisation_form','federation','core'),('colonialism_stance','reparative_decolonial','core'),('transition_method','prefigurative','core'),('class_analysis','central_marxist','strong')],
 'makhnovism': [('urban_rural','agrarian_rural','core'),('legitimate_violence','communal_militia','core'),('land_regime','commons','core'),('transition_method','insurrection','core')],
 'christian_anarchism': [('sovereignty_locus','divine','core'),('violence_legitimacy','never','core'),('rights_basis','divine_law','core'),('religion_in_public_life','spiritual_syncretic','core')],
 'anarcho_naturism': [('urban_rural','back_to_land','core'),('nonhuman_status','rights_bearing','core'),('technology_stance','appropriate_scale','core'),('healthcare','communal_mutual','strong')],
 'philosophic_radicalism': [('epistemic_authority','scientific_expertise','core'),('tradition_stance','reject','core'),('rights_basis','positive_legal','core'),('punishment','rehabilitative','core')],
 'neoclassical_liberalism': [('basic_income','support_ubi','core'),('market_role','central','core'),('immigration','open_borders','core'),('distribution_principle','subsistence_guarantee','core')],
 'sultan_galievism': [('nation_concept','religious','core'),('race_politics','liberationist_nationalist','core'),('religion_in_public_life','culturally_grounded','core'),('imperialism_analysis','central_frame','core')],
 'prachanda_path': [('federalism','federal','core'),('electoral_participation','tactical','core'),('indigenous_sovereignty','recognise_cultural','strong'),('political_pluralism','multiparty','typical')],
 'third_camp': [('political_pluralism','multiparty','core'),('speech_norms','broadly_free','core'),('imperialism_analysis','secondary','strong'),('property_regime','state_owned','typical')],
 'bureaucratic_collectivism': [('property_regime','state_owned','core'),('class_analysis','central_marxist','core'),('vanguard_role','rejected','typical'),('state_trajectory','wither_away','strong')],
 'neoism': [('art_and_culture','avant_garde_rupture','core'),('organisation_form','network','core'),('tradition_stance','reject','core'),('utopian_horizon','none_pragmatic','core')],
 'technocracy_movement': [('money_form','abolished','core'),('economic_coordination','moneyless_planning','core'),('scale_of_polity','continental_bloc','core'),('distribution_principle','equal_share','core')],
}

count = 0
for path in glob.glob('kb/ideologies/*.yaml'):
    lines = open(path, encoding='utf-8').read().split('\n')
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        m = re.match(r'^  - id: (\S+)\s*$', line)
        if m and m.group(1) in ADD:
            target = m.group(1)
            # walk to the entry's positions block and collect existing tenet keys
            j = i + 1
            pos_start = None
            existing = set()
            while j < len(lines) and not re.match(r'^  - id: ', lines[j]):
                if re.match(r'^    positions:\s*$', lines[j]):
                    pos_start = j
                elif pos_start is not None and re.match(r'^      (\S+):', lines[j]):
                    existing.add(re.match(r'^      (\S+):', lines[j]).group(1))
                j += 1
            additions = [(t, v, s) for t, v, s in ADD[target] if t not in existing]
            if pos_start is not None and additions:
                # copy through to end of positions block, then append
                k = i + 1
                while k < j:
                    out.append(lines[k])
                    k += 1
                while out and out[-1].strip() == '':
                    out.pop()
                for t, v, s in additions:
                    out.append(f'      {t}: [{v}, {s}]')
                    count += 1
                out.append('')
                i = j
                continue
        i += 1
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
print('positions added:', count)
