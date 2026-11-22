import { Award, GameMode, Player } from '@huiskamer-show/shared';

export class AwardsEngine {
  public static computeAwards(players: Player[], gameMode: GameMode): Award[] {
    if (players.length === 0) return [];

    const awards: Award[] = [];
    const awardedPlayerIds = new Set<string>();

    // Sort players by score descending (tie-break by stars count)
    const byScore = [...players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.stars.length - a.stars.length;
    });

    // 1. Show-Kampioen (highest score / most stars)
    const champ = byScore[0];
    if (champ) {
      awards.push({
        id: 'award_champion',
        title: gameMode === 'coop' ? 'Gezins-Ster Kampioen' : 'Show-Kampioen',
        subtitle: 'De meeste punten en sterren verzameld in de show!',
        icon: '🏆',
        playerId: champ.id,
        playerName: champ.name,
        avatarId: champ.avatarId,
        color: champ.color,
        valueLabel: `${champ.score} ptn · ${champ.stars.length} ⭐`,
      });
      awardedPlayerIds.add(champ.id);
    }

    // Helper to pick best player for a metric, preferring unawarded players first
    const pickCandidate = (
      candidates: Player[],
      metricFn: (p: Player) => number,
      higherIsBetter = true
    ): Player | null => {
      if (candidates.length === 0) return null;
      const unawarded = candidates.filter((p) => !awardedPlayerIds.has(p.id));
      const pool = unawarded.length > 0 ? unawarded : candidates;
      const sorted = [...pool].sort((a, b) =>
        higherIsBetter ? metricFn(b) - metricFn(a) : metricFn(a) - metricFn(b)
      );
      return sorted[0] || null;
    };

    // 2. Meester-Uitbeelder (best 30 Seconds + Pantomime performance)
    const actingCandidates = players.filter(
      (p) => p.stats.thirtySecondsGuessed > 0 || p.stats.pantomimeEarned > 0
    );
    const actorWinner = pickCandidate(
      actingCandidates,
      (p) => p.stats.thirtySecondsGuessed + p.stats.pantomimeEarned * 2,
      true
    );
    if (actorWinner && !awardedPlayerIds.has(actorWinner.id)) {
      const parts: string[] = [];
      if (actorWinner.stats.thirtySecondsGuessed > 0) {
        parts.push(`${actorWinner.stats.thirtySecondsGuessed}× 30s`);
      }
      if (actorWinner.stats.pantomimeEarned > 0) {
        parts.push(`${actorWinner.stats.pantomimeEarned}× Pantomime`);
      }
      awards.push({
        id: 'award_actor',
        title: 'Meester-Uitbeelder',
        subtitle: 'Fantastisch omschreven en uitgebeeld op het podium!',
        icon: '🎭',
        playerId: actorWinner.id,
        playerName: actorWinner.name,
        avatarId: actorWinner.avatarId,
        color: actorWinner.color,
        valueLabel: parts.join(' · ') || 'Top uitbeelder!',
      });
      awardedPlayerIds.add(actorWinner.id);
    }

    // 2b. Schattings-Meester (most Dichtstbij Wint wins)
    const estimateCandidates = players.filter((p) => p.stats.estimateWins > 0);
    const estimateWinner = pickCandidate(
      estimateCandidates,
      (p) => p.stats.estimateWins,
      true
    );
    if (estimateWinner && !awardedPlayerIds.has(estimateWinner.id)) {
      awards.push({
        id: 'award_estimate',
        title: 'Schattings-Meester',
        subtitle: 'Zat keer op keer het dichtst bij het goede getal!',
        icon: '🎯',
        playerId: estimateWinner.id,
        playerName: estimateWinner.name,
        avatarId: estimateWinner.avatarId,
        color: estimateWinner.color,
        valueLabel: `${estimateWinner.stats.estimateWins}× dichtstbij!`,
      });
      awardedPlayerIds.add(estimateWinner.id);
    }

    // 3. Gouden Oren (most sound challenges correct)
    const soundCandidates = players.filter((p) => p.stats.soundCorrect > 0);
    const soundWinner = pickCandidate(
      soundCandidates,
      (p) => p.stats.soundCorrect,
      true
    );
    if (soundWinner && !awardedPlayerIds.has(soundWinner.id)) {
      awards.push({
        id: 'award_ears',
        title: 'Gouden Oren',
        subtitle: 'Herkende de geluiden uit de TV razendsnel!',
        icon: '🎵',
        playerId: soundWinner.id,
        playerName: soundWinner.name,
        avatarId: soundWinner.avatarId,
        color: soundWinner.color,
        valueLabel: `${soundWinner.stats.soundCorrect} geluiden goed`,
      });
      awardedPlayerIds.add(soundWinner.id);
    }

    // 4. Quiz-Professor (highest quiz percentage or count)
    const quizCandidates = players.filter((p) => p.stats.quizTotal > 0);
    const quizWinner = pickCandidate(
      quizCandidates,
      (p) =>
        p.stats.quizTotal > 0
          ? p.stats.quizCorrect / p.stats.quizTotal + p.stats.quizCorrect * 0.01
          : 0,
      true
    );
    if (quizWinner && !awardedPlayerIds.has(quizWinner.id)) {
      const pct = Math.round(
        (quizWinner.stats.quizCorrect / Math.max(1, quizWinner.stats.quizTotal)) *
          100
      );
      awards.push({
        id: 'award_professor',
        title: 'Quiz-Professor',
        subtitle: 'Superveel slimme quizvragen goed beantwoord!',
        icon: '🧠',
        playerId: quizWinner.id,
        playerName: quizWinner.name,
        avatarId: quizWinner.avatarId,
        color: quizWinner.color,
        valueLabel: `${pct}% goed (${quizWinner.stats.quizCorrect}/${quizWinner.stats.quizTotal})`,
      });
      awardedPlayerIds.add(quizWinner.id);
    }

    // 5. Bliksemsnelle Buzzer (fastest average response time or most zoom correct)
    const speedCandidates = players.filter(
      (p) => p.stats.avgResponseMs > 0 || p.stats.zoomCorrect > 0
    );
    const speedWinner = pickCandidate(
      speedCandidates,
      (p) =>
        p.stats.zoomCorrect * 10000 -
        (p.stats.avgResponseMs > 0 ? p.stats.avgResponseMs : 99999),
      true
    );
    if (speedWinner && !awardedPlayerIds.has(speedWinner.id)) {
      const sec =
        speedWinner.stats.avgResponseMs > 0
          ? `${(speedWinner.stats.avgResponseMs / 1000).toFixed(1)}s reactietijd`
          : `${speedWinner.stats.zoomCorrect}× Zoom-Buzzer`;
      awards.push({
        id: 'award_speed',
        title: 'Bliksemsnelle Buzzer',
        subtitle: 'Vliegensvlugge vingers op het scherm!',
        icon: '⚡',
        playerId: speedWinner.id,
        playerName: speedWinner.name,
        avatarId: speedWinner.avatarId,
        color: speedWinner.color,
        valueLabel: sec,
      });
      awardedPlayerIds.add(speedWinner.id);
    }

    // 6. Guarantee every remaining player receives a positive, personalized award!
    const fallbackTitles = [
      {
        title: 'Super Teamspeler',
        subtitle: 'Maakte de show één groot feest voor het hele gezin!',
        icon: '🌟',
      },
      {
        title: 'Bliksemsnelle Buzzer',
        subtitle: 'Altijd scherp en klaar voor elke ronde!',
        icon: '⚡',
      },
      {
        title: 'Quiz-Professor',
        subtitle: 'Geweldige inzet en slimme antwoorden!',
        icon: '🧠',
      },
      {
        title: 'Gouden Showster',
        subtitle: 'Straalde van begin tot eind op het podium!',
        icon: '✨',
      },
    ];

    let fbIdx = 0;
    for (const player of players) {
      if (!awardedPlayerIds.has(player.id)) {
        const fb = fallbackTitles[fbIdx % fallbackTitles.length];
        fbIdx++;
        awards.push({
          id: `award_guaranteed_${player.id}`,
          title: fb.title,
          subtitle: fb.subtitle,
          icon: fb.icon,
          playerId: player.id,
          playerName: player.name,
          avatarId: player.avatarId,
          color: player.color,
          valueLabel: `${player.score} ptn · ${player.stars.length} ⭐`,
        });
        awardedPlayerIds.add(player.id);
      }
    }

    return awards;
  }
}
