# MEU ESTUDO CFC

Aplicativo pessoal em lavanda para estudar o Exame de Suficiência do CFC. PWA estática, sem mensalidade, serviços externos, cadastro ou dependências de frontend.

## Conteúdo

- 1.150 questões: duas edições por ano de 2016 a 2025 (1.000 questões), mais 2026.1, 2026.2 e a reaplicação 2024.1 do Rio Grande do Sul.
- Caderno único de 2016–2017; caderno tipo 1 nos demais exames. Tipos de caderno com questões apenas reordenadas não são duplicados.
- PDFs originais, recortes legíveis com tabelas, texto pesquisável, fontes e hashes SHA-256.
- Simulado por prova ou sorteio sem repetição de 10, 20, 30 ou 50 questões de todas as provas; opção de excluir gabaritos preliminares.
- Cronômetro, retomada, correção ao finalizar, revisão, favoritas, anotações, erros e exportação/importação de progresso.

## Rodar no computador

Instale Node.js 20 ou superior. Na pasta do projeto:

```sh
npm run dev
```

Abra `http://127.0.0.1:8843`. Para outra porta: configure a variável `PORT` antes de executar o comando. Não existe etapa de instalação de dependências ou build.

```sh
npm test
```

## Publicar no GitHub

1. Crie um repositório e envie o conteúdo desta pasta, mantendo `dist`, `scripts`, `tests` e `.github` na raiz.
2. Use a branch `main` ou ajuste o arquivo `.github/workflows/pages.yml` para sua branch.
3. No repositório, abra Settings > Pages e selecione **GitHub Actions** como origem.
4. O workflow executa os testes e publica `dist` em GitHub Pages. O endereço final aparece na execução da Action.

Os caminhos são relativos: o aplicativo funciona também no subdiretório `usuario.github.io/repositorio/`. A publicação no GitHub não foi realizada automaticamente. Um repositório público disponibiliza os arquivos a terceiros; verifique os direitos de redistribuição dos cadernos antes de torná-lo público.

## Instalar e usar offline

Em HTTPS ou localhost, o navegador registra `dist/sw.js`. Em navegadores compatíveis, aparece **Instalar aplicativo**. No iPhone/iPad, utilize Safari > Compartilhar > Adicionar à Tela de Início.

O banco textual e a interface ficam em cache após o primeiro acesso. Use **Baixar questões offline** e aguarde a confirmação para armazenar todos os enunciados em imagem. Um download interrompido pode ser retomado. Os PDFs completos são opcionais e entram no cache quando abertos; não fazem parte do download dos enunciados. O armazenamento depende do espaço disponível e pode ser removido pelo navegador. Exporte backups regularmente.

Não há sincronização entre dispositivos. A instalação no aparelho e o workflow real do GitHub dependem do navegador/conta da usuária e não foram executados no seu lugar.

## Banco de dados

- `dist/questions.sqlite`: SQLite com tabelas `exams` e `questions`, incluindo metadados e conteúdo JSON. Pronto para futura API/backend.
- `dist/bank.json`: versão portável com perguntas e provas.
- `dist/bank.js`: os mesmos dados carregados pela interface sem dependências.
- IndexedDB `meu-estudo-cfc`: tabelas `questions`, `exams`, `settings` no dispositivo.
- O progresso também usa localStorage como fallback. A chave antiga `lavanda-v1` é lida somente para migrar o progresso existente.
- `dist/sources.json`: origem de cada prova/gabarito, status, versão e hashes dos PDFs.

Para regenerar o banco a partir dos PDFs já incluídos:

```sh
python -m pip install -r scripts/requirements.txt
python scripts/import_bank.py
npm test
```

## Precisão e limitações

Levantamento em **06/10/2026**. Todas as edições estão no banco, mas **2018.1 e 2022.1** usam os gabaritos preliminares recuperados no acervo oficial do CRCSP: os links definitivos antigos estavam indisponíveis. **2026.2** também usa gabarito preliminar publicado pela FGV. Essas correções são identificadas na interface e excluídas do aproveitamento definitivo. Não foram substituídas por respostas inventadas. Ao recuperar um gabarito final, atualize o PDF e os metadados, regenere e revise o banco.

2020.1 foi uma aplicação online com questões e alternativas embaralhadas. A ordenação usada é a do documento oficial definitivo, com A–D atribuídas na ordem em que cada alternativa aparece. As indicações de resposta correta/anulação foram removidas do enunciado mostrado no simulado, mantendo o PDF original intacto. Anuladas recebem ponto no simulado e não entram no aproveitamento de estudo.

Os recortes e textos são extrações automáticas validadas quanto à quantidade, sequência e presença das alternativas, com inspeção visual de amostras. Não constituem revisão pedagógica humana integral. Para dúvidas de formatação, consulte o PDF da edição. Muitos itens permanecem como **Conteúdo misto**, sem classificação individual por matéria. Não há comentários explicativos. As normas e respostas devem ser interpretadas na época de cada prova.

Fontes principais: [CFC](https://cfc.org.br/exame-de-suficiencia-anteriores/), [acervo CRCSP](https://crcsp.org.br/portal/exames/suficiencia.htm) e [FGV](https://conhecimento.fgv.br/exames/cfc). Alguns gabaritos definitivos da Consulplan foram recuperados em cópias do mesmo documento, com a origem exata registrada em `sources.json`.

## Licença

O código original do aplicativo usa a licença MIT em `LICENSE`. Essa licença **não se aplica** às questões, textos, imagens, tabelas, PDFs, marcas ou outros conteúdos dos exames. Seus direitos pertencem aos respectivos titulares. A disponibilidade pública dos cadernos não implica autorização irrestrita de redistribuição. Plataforma independente, sem vínculo com CFC, FBC, Consulplan ou FGV.
# PDFs pessoais

A aba Meus PDFs importa um PDF de questoes e, opcionalmente, outro de gabarito. A leitura acontece no dispositivo com PDF.js (Apache-2.0, licenca em dist/vendor/pdfjs/LICENSE). Os arquivos nao sao enviados a servidores. Depois de revisar enunciados e respostas, salve a prova para seleciona-la no simulado ou misturar suas questoes com as demais.

Limites: 25 MB e 200 paginas por arquivo, ate 200 questoes por prova. PDFs digitalizados como imagem nao possuem OCR automatico: use a revisao para preencher manualmente. Diagramas e tabelas podem exigir correcao manual. O gabarito importado e pessoal, nao validado contra fontes oficiais.

PDFs ficam no IndexedDB deste navegador. Limpar os dados do site os remove. O backup de progresso nao inclui os PDFs; conserve os arquivos originais. Editar uma prova importada reinicia seu progresso associado. Finalize simulados ativos antes de editar ou excluir suas provas.

